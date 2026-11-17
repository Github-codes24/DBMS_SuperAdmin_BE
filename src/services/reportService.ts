import { Types } from "mongoose";
import { User } from "../models/User";
import { Role } from "../models/roles";
import type { ReportQuery } from "../validators/reportValidator";

const RANGE_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };

export async function getUsersReport(q: ReportQuery) {
  const { projectId, range, status, page, limit } = q;
  const and: Record<string, unknown>[] = [];

  if (projectId) {
    and.push({
      $or: [
        { "projectRoles.projectId": new Types.ObjectId(projectId) },
        { projectIds: projectId },
      ],
    });
  }

  const days = RANGE_DAYS[range];
  if (days) and.push({ createdAt: { $gte: new Date(Date.now() - days * 86400000) } });

  if (status === "active") and.push({ isActive: true });
  if (status === "inactive" || status === "blocked") and.push({ isActive: false });

  const filter = and.length ? { $and: and } : {};

  const roleStage: any[] = [
    { $unwind: { path: "$projectRoles", preserveNullAndEmptyArrays: true } },
    ...(projectId
      ? [{
          $match: {
            $or: [
              { "projectRoles.projectId": new Types.ObjectId(projectId) },
              { projectRoles: { $exists: false } },
            ],
          },
        }]
      : []),
    { $lookup: { from: "roles", localField: "projectRoles.roleId", foreignField: "_id", as: "r" } },
    { $group: { _id: { $ifNull: [{ $arrayElemAt: ["$r.name", 0] }, "$role"] }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ];

  const [total, active, trend, byRole, docs] = await Promise.all([
    User.countDocuments(filter),
    User.countDocuments({ $and: [...and, { isActive: true }] }),
    User.aggregate([
      { $match: filter },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    User.aggregate([{ $match: filter }, ...roleStage]),
    User.find(filter)
      .select("name email role projectRoles isActive lastLoginAt createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  const roleIds = docs.flatMap((d: any) => (d.projectRoles ?? []).map((pr: any) => pr.roleId));
  const roles = roleIds.length
    ? await Role.find({ _id: { $in: roleIds } }).select("name").lean()
    : [];
  const roleMap = new Map(roles.map((r: any) => [String(r._id), r.name as string]));

  const rows = docs.map((d: any) => {
    const names = (d.projectRoles ?? [])
      .map((pr: any) => roleMap.get(String(pr.roleId)))
      .filter(Boolean);
    return {
      id: String(d._id),
      name: d.name,
      email: d.email,
      roles: names.length ? names : [d.role], // legacy users fall back to old role
      isActive: d.isActive ?? true,
      lastLoginAt: d.lastLoginAt ?? null,
      createdAt: d.createdAt,
    };
  });

  return {
    summary: { total, active, blocked: total - active },
    trend: trend.map((t: any) => ({ date: t._id, count: t.count })),
    breakdown: byRole.map((b: any) => ({ label: String(b._id), count: b.count })),
    rows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
}