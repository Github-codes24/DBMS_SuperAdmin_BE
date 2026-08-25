/**
 * Telecaller CRM — Payment Service
 * Handles Razorpay order creation, payment link generation,
 * and order total calculation with GST and discount logic.
 */
import Razorpay from 'razorpay';

// ─── Razorpay instance ────────────────────────────────────────────────────────
const getRazorpayInstance = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials are not configured in .env (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)');
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// ─── Constants ────────────────────────────────────────────────────────────────
const GST_RATE = 18; // 18% GST

// ─── Order Total Calculation ──────────────────────────────────────────────────

/**
 * Calculate order financials from package list and optional discount.
 *
 * @param {Array<{name: string, amount: number, quantity: number}>} packages
 * @param {number} discountPercent - 0 to 100
 * @returns {{ subtotal, discountAmount, gstAmount, grandTotal, gstRate, discount }}
 */
export const calculateOrderTotal = (packages, discountPercent = 0) => {
  // Subtotal = sum of (amount × quantity) for each package
  const subtotal = packages.reduce((sum, pkg) => {
    const qty = pkg.quantity || 1;
    return sum + pkg.amount * qty;
  }, 0);

  // Apply discount
  const discount = Math.max(0, Math.min(100, Number(discountPercent)));
  const discountAmount = parseFloat(((subtotal * discount) / 100).toFixed(2));
  const afterDiscount = subtotal - discountAmount;

  // Apply GST on discounted amount
  const gstAmount = parseFloat(((afterDiscount * GST_RATE) / 100).toFixed(2));
  const grandTotal = parseFloat((afterDiscount + gstAmount).toFixed(2));

  return {
    subtotal,
    discount,
    discountAmount,
    gstRate: GST_RATE,
    gstAmount,
    grandTotal,
  };
};

// ─── Create Razorpay Order ────────────────────────────────────────────────────

/**
 * Create a Razorpay order for the given amount (in INR).
 * Razorpay expects amount in paise (integer).
 *
 * @param {number} grandTotal - Total in INR
 * @param {string} receipt   - Unique receipt identifier
 * @returns {Promise<object>} Razorpay order object
 */
export const createRazorpayOrder = async (grandTotal, receipt) => {
  const razorpay = getRazorpayInstance();

  const order = await razorpay.orders.create({
    amount: Math.round(grandTotal * 100), // Convert INR → paise
    currency: 'INR',
    receipt,
    payment_capture: 1,
  });

  return order;
};

// ─── Generate Razorpay Payment Link ──────────────────────────────────────────

/**
 * Generate a Razorpay Payment Link for the given amount.
 *
 * @param {number} grandTotal     - Total in INR
 * @param {string} description    - Line item description
 * @param {string} vendorIdStr    - Vendor identifier for reference
 * @returns {Promise<object>} Razorpay payment link object
 */
export const generatePaymentLink = async (grandTotal, description, vendorIdStr) => {
  const razorpay = getRazorpayInstance();

  const amountInPaise = Math.round(grandTotal * 100);

  const paymentLink = await razorpay.paymentLink.create({
    amount: amountInPaise,
    currency: 'INR',
    accept_partial: false,
    description,
    reference_id: `LTS-${vendorIdStr}-${Date.now()}`,
    notify: {
      sms: true,
      email: true,
    },
    reminder_enable: true,
  });

  return paymentLink;
};


