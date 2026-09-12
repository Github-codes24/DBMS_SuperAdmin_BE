/**
 * Telecaller CRM — Payment Controller
 * Handles Razorpay payment order creation and sending payment links.
 */
import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';
import PaymentOrder from '../models/PaymentOrder.js';
import Plan from '../models/Plan.js';
import Vendor from '../../VendorPanel/Authentication/authSchema.js';
import { calculateOrderTotal, createRazorpayOrder, generatePaymentLink } from '../services/payment.service.js';
import { sendNotification } from '../utils/notificationSender.js';
import { validateDiscount } from '../validations/vendor.validation.js';

// ─── POST /api/telecaller/payment/create-order ───────────────────────────────
/**
 * @desc   Create a Razorpay payment order for a vendor
 * @route  POST /api/telecaller/payment/create-order
 * @access Private (Telecaller)
 *
 * Body: { vendorId, planId?, duration?, gateway?, packages?: [{name, amount, quantity?}], discount? }
 */
export const createOrder = asyncHandler(async (req, res) => {
  const { vendorId, planId, plan_id, duration, gateway = 'Razorpay', packages: incomingPackages, discount: incomingDiscount } = req.body;

  if (!vendorId) {
    return sendError(res, 'vendorId is required.');
  }

  // Resolve vendorId to a valid MongoDB ObjectId if vendorId string or email is passed
  let resolvedVendorId = vendorId;
  if (!String(vendorId).match(/^[0-9a-fA-F]{24}$/)) {
    const matchedVendor = await Vendor.findOne({
      $or: [
        { vendorId: String(vendorId).trim() },
        { email: String(vendorId).toLowerCase().trim() }
      ]
    });
    if (matchedVendor) {
      resolvedVendorId = matchedVendor._id;
    }
  }

  let finalPackages = incomingPackages;
  let effectiveDiscount = incomingDiscount !== undefined && incomingDiscount !== null ? Number(incomingDiscount) : 0;

  // 1. If planId is provided, fetch and validate plan securely from backend DB
  const targetPlanId = planId || plan_id;
  if (targetPlanId) {
    let selectedPlan = null;
    if (String(targetPlanId).match(/^[0-9a-fA-F]{24}$/)) {
      selectedPlan = await Plan.findById(targetPlanId);
    }
    if (!selectedPlan) {
      selectedPlan = await Plan.findOne({ planId: targetPlanId });
    }

    if (!selectedPlan) {
      return sendError(res, `Invalid plan selected: '${targetPlanId}'. Plan not found in database.`, 404);
    }

    if (!selectedPlan.isActive) {
      return sendError(res, `The selected plan '${selectedPlan.name}' is currently inactive.`, 400);
    }

    // Securely use backend plan price
    finalPackages = [
      {
        name: `${selectedPlan.name} (${selectedPlan.duration})`,
        amount: selectedPlan.price,
        quantity: 1,
        planId: selectedPlan.planId,
        duration: selectedPlan.duration,
        durationInMonths: selectedPlan.durationInMonths,
      },
    ];

    // If no custom discount was explicitly provided, use default plan discount
    if (incomingDiscount === undefined || incomingDiscount === null) {
      effectiveDiscount = selectedPlan.discount || 0;
    }
  }

  if (!finalPackages || !Array.isArray(finalPackages) || finalPackages.length === 0) {
    return sendError(res, 'Either a valid planId or at least one package is required.');
  }

  // Validate each package entry
  for (const pkg of finalPackages) {
    if (!pkg.name || pkg.amount === undefined || pkg.amount < 0) {
      return sendError(res, 'Each package must have a name and a non-negative amount.');
    }
  }

  // Validate discount
  const discountValidation = validateDiscount(effectiveDiscount);
  if (!discountValidation.valid) {
    return sendError(res, discountValidation.message);
  }

  // Calculate financials
  const { subtotal, discountAmount, gstRate, gstAmount, grandTotal, discount: discountPct } = calculateOrderTotal(finalPackages, effectiveDiscount);

  // Generate Razorpay payment link
  let razorpayOrderId = '';
  let paymentLink = '';

  try {
    const description = `LTS Package Payment - Vendor ${vendorId}`;
    const linkData = await generatePaymentLink(grandTotal, description, String(vendorId));
    razorpayOrderId = linkData.id || '';
    paymentLink = linkData.short_url || linkData.payment_url || '';
  } catch (razorpayErr) {
    console.error('[Razorpay Error]', razorpayErr.message);
    // Continue saving the order even if Razorpay is unavailable (dev mode)
    paymentLink = '';
    razorpayOrderId = `DEV-${Date.now()}`;
  }

  // Persist payment order
  const telecallerId = req.telecaller?._id || req.vendor?._id || null;
  const order = await PaymentOrder.create({
    vendorId: resolvedVendorId,
    telecallerId,
    gateway,
    packages: finalPackages,
    subtotal,
    discount: discountPct,
    discountAmount,
    gstRate,
    gstAmount,
    grandTotal,
    razorpayOrderId,
    paymentLink,
    paymentStatus: 'Pending',
  });

  return sendSuccess(res, 'Payment order created successfully', {
    orderId: order._id,
    razorpayOrderId,
    paymentLink,
    plan: targetPlanId ? finalPackages[0] : undefined,
    packages: finalPackages,
    subtotal,
    discount: discountPct,
    discountAmount,
    gstRate,
    gstAmount,
    grandTotal,
  }, 201);
});

// ─── POST /api/telecaller/payment/send-link/:orderId ─────────────────────────

/**
 * @desc   Send payment link to vendor via WhatsApp/Email and log notification
 * @route  POST /api/telecaller/payment/send-link/:orderId
 * @access Private (Telecaller)
 *
 * Body: { channel: 'WHATSAPP' | 'EMAIL', customerName? }
 */
export const sendPaymentLink = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { channel, customerName = 'Vendor' } = req.body;

  const validChannels = ['SMS', 'EMAIL', 'WHATSAPP'];
  if (!channel || !validChannels.includes(channel)) {
    return sendError(res, `channel must be one of: ${validChannels.join(', ')}`);
  }

  const order = await PaymentOrder.findById(orderId);
  if (!order) {
    return sendError(res, 'Payment order not found', 404);
  }

  if (!order.paymentLink) {
    return sendError(res, 'No payment link available for this order. Please regenerate.', 400);
  }

  const message = `Dear ${customerName}, your payment link for LTS package is ready. Amount: ₹${order.grandTotal}. Pay here: ${order.paymentLink}`;

  // Send notification and create log
  const notification = await sendNotification({
    vendorId: order.vendorId,
    customerName,
    channel,
    message,
    sentBy: req.vendor._id,
  });

  return sendSuccess(res, `Payment link sent via ${channel} successfully`, {
    notificationId: notification._id,
    channel,
    deliveryStatus: notification.deliveryStatus,
    paymentLink: order.paymentLink,
  });
});
