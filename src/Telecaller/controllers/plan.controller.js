import asyncHandler from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/responseHelper.js";
import Plan from "../models/Plan.js";

/**
 * @desc   Get all active subscription plans
 * @route  GET /api/telecaller/plans, GET /api/customer/plan, GET /api/plans
 * @access Public / Telecaller
 */
export const getActivePlans = asyncHandler(async (req, res) => {
  // Query both live-synced records (isDelete != true) and legacy records (isActive != false)
  const filter = {
    $and: [
      { isDelete: { $ne: true } },
      { isDeleted: { $ne: true } },
      { isActive: { $ne: false } },
    ],
  };

  const plans = await Plan.find(filter)
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean();

  // Normalize records so frontend receives both standard fields and live duration options
  const normalizedPlans = plans.map((plan) => {
    const planName =
      plan.name ||
      (plan.category && plan.subCategory
        ? `${plan.category} ${plan.subCategory}`
        : plan.subCategory || plan.category || "Subscription Plan");

    const firstDuration = Array.isArray(plan.durations) && plan.durations.length > 0
      ? plan.durations[0]
      : null;

    const basePrice =
      plan.finalAmount ??
      plan.price ??
      (firstDuration ? Number(firstDuration.price) || firstDuration.totalPayable : 0);

    return {
      ...plan,
      name: planName,
      displayName: planName,
      price: basePrice,
      duration:
        plan.duration ||
        (firstDuration
          ? `${firstDuration.durationInMonths || Math.round((firstDuration.duration || 30) / 30)} Month(s)`
          : "N/A"),
      durationInMonths:
        plan.durationInMonths ??
        (firstDuration?.durationInMonths || Math.round((firstDuration?.duration || 30) / 30) || 1),
      isActive: plan.isActive !== false && plan.isDelete !== true && plan.isDeleted !== true,
    };
  });

  return sendSuccess(res, "Subscription plans fetched successfully", normalizedPlans);
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
    plan = await Plan.findById(id).lean();
  }

  if (!plan) {
    plan = await Plan.findOne({
      $or: [{ planId: id }, { code: id }, { subCategory: id }],
    }).lean();
  }

  if (!plan) {
    return sendError(res, "Subscription plan not found", 404);
  }

  const planName =
    plan.name ||
    (plan.category && plan.subCategory
      ? `${plan.category} ${plan.subCategory}`
      : plan.subCategory || plan.category || "Subscription Plan");

  const firstDuration = Array.isArray(plan.durations) && plan.durations.length > 0
    ? plan.durations[0]
    : null;

  const basePrice =
    plan.finalAmount ??
    plan.price ??
    (firstDuration ? Number(firstDuration.price) || firstDuration.totalPayable : 0);

  const normalizedPlan = {
    ...plan,
    name: planName,
    displayName: planName,
    price: basePrice,
    isActive: plan.isActive !== false && plan.isDelete !== true && plan.isDeleted !== true,
  };

  return sendSuccess(res, "Subscription plan details fetched successfully", normalizedPlan);
});
