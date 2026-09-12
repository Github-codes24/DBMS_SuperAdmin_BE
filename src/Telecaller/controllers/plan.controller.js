import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';
import Plan from '../models/Plan.js';

// Default Master Subscription Plans
export const DEFAULT_PLANS = [
  {
    planId: 'PLAN_STARTER_1M',
    name: 'Starter Plan',
    code: 'STARTER',
    description: 'Essential local business listing package for small vendors getting started on Local Trade Street.',
    duration: '1 Month',
    durationInMonths: 1,
    price: 1999,
    originalPrice: 1999,
    discount: 0,
    finalAmount: 1999,
    features: [
      'Basic Verified Business Badge',
      'Up to 50 Product Listings',
      'Standard Search Visibility',
      'Customer Inquiry Alerts',
      'Standard Support',
    ],
    isPopular: false,
    isActive: true,
    sortOrder: 1,
  },
  {
    planId: 'PLAN_SILVER_3M',
    name: 'Silver Growth Plan',
    code: 'SILVER',
    description: 'Accelerate your store growth with enhanced category search placement and lead management.',
    duration: '3 Months',
    durationInMonths: 3,
    price: 4999,
    originalPrice: 4999,
    discount: 10,
    finalAmount: 4499.1,
    features: [
      'Silver Verified Trust Badge',
      'Up to 150 Product Listings',
      'Top 10 Category Placement',
      'Direct WhatsApp Inquiry Integration',
      'Priority Lead Notifications',
      'Monthly Performance Summary',
    ],
    isPopular: false,
    isActive: true,
    sortOrder: 2,
  },
  {
    planId: 'PLAN_GOLD_6M',
    name: 'Gold Premium Plan',
    code: 'GOLD',
    description: 'Our most popular tier. Maximum exposure across your city with dedicated telecaller follow-ups.',
    duration: '6 Months',
    durationInMonths: 6,
    price: 9999,
    originalPrice: 9999,
    discount: 15,
    finalAmount: 8499.15,
    features: [
      'Gold Premium Store Badge',
      'Unlimited Product Listings',
      'Top 3 Search & Category Ranking',
      'Dedicated Telecaller Sales Follow-up',
      'Custom Storefront Banner & Logo Highlight',
      'Full CRM Customer Lead Access',
      '24/7 Priority Agent Support',
    ],
    isPopular: true,
    isActive: true,
    sortOrder: 3,
  },
  {
    planId: 'PLAN_PLATINUM_12M',
    name: 'Platinum Enterprise Plan',
    code: 'PLATINUM',
    description: 'Comprehensive annual subscription for established brands seeking #1 market leadership and full CRM capabilities.',
    duration: '1 Year',
    durationInMonths: 12,
    price: 18999,
    originalPrice: 18999,
    discount: 20,
    finalAmount: 15199.2,
    features: [
      'VIP Platinum Crown Badge',
      '#1 Top Ranking in City & Category',
      'Unlimited Products & Video Showcases',
      'Dedicated Account Manager & Telecaller Team',
      'Homepage Featured Merchant Showcase',
      'Automated MSG91 SMS & Email Promotions',
      'Instant Lead Call-Connecting Feature',
      'Quarterly Business Review & Analytics Reports',
    ],
    isPopular: false,
    isActive: true,
    sortOrder: 4,
  },
];

/**
 * @desc   Get all active subscription plans
 * @route  GET /api/telecaller/plans, GET /api/customer/plan, GET /api/plans
 * @access Public / Telecaller
 */
export const getActivePlans = asyncHandler(async (req, res) => {
  let plans = await Plan.find({ isActive: true }).sort({ sortOrder: 1, price: 1 });

  // Auto-seed default plans if collection is empty
  if (!plans || plans.length === 0) {
    await Plan.insertMany(DEFAULT_PLANS);
    plans = await Plan.find({ isActive: true }).sort({ sortOrder: 1, price: 1 });
  }

  return sendSuccess(res, 'Subscription plans fetched successfully', plans);
});

/**
 * @desc   Get single plan by ID or planId
 * @route  GET /api/telecaller/plans/:id
 * @access Public / Telecaller
 */
export const getPlanById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let plan = null;
  if (id.match(/^[0-9a-fA-F]{24}$/)) {
    plan = await Plan.findById(id);
  }

  if (!plan) {
    plan = await Plan.findOne({ planId: id });
  }

  if (!plan) {
    return sendError(res, 'Subscription plan not found', 404);
  }

  return sendSuccess(res, 'Subscription plan details fetched successfully', plan);
});
