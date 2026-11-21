import { Types } from "mongoose";
import { User } from "../models/User";
import { Role } from "../models/roles";
import type { ReportQuery } from "../validators/reportValidator";
import { Parser } from "json2csv";

const RANGE_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };

export async function getUsersReport(q: ReportQuery) {
  const { projectId, range, status, page, limit, from, to } = q;
  const and: Record<string, unknown>[] = [];

  if (projectId) {
    and.push({
      $or: [
        { "projectRoles.projectId": new Types.ObjectId(projectId) },
        { projectIds: projectId },
      ],
    });
  }

  if (range === "custom") {
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);

      // Include the complete "to" date
      toDate.setHours(23, 59, 59, 999);

      and.push({
        createdAt: {
          $gte: fromDate,
          $lte: toDate,
        },
      });
    }
  } else {
    const days = RANGE_DAYS[range];

    if (days) {
      and.push({
        createdAt: {
          $gte: new Date(Date.now() - days * 86400000),
        },
      });
    }
  }

  if (status === "active") and.push({ isActive: true });
  if (status === "inactive" || status === "blocked") {
    and.push({ isActive: false });
  }

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

export async function exportUsersReport(q: ReportQuery) {
  const { projectId, range, status } = q;
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
  if (days) {
    and.push({
      createdAt: {
        $gte: new Date(Date.now() - days * 86400000),
      },
    });
  }

  if (status === "active") {
    and.push({ isActive: true });
  }

  if (status === "inactive" || status === "blocked") {
    and.push({ isActive: false });
  }

  const filter = and.length ? { $and: and } : {};

  const docs = await User.find(filter)
    .select("name email role projectRoles isActive lastLoginAt createdAt")
    .sort({ createdAt: -1 })
    .lean();

  const roleIds = docs.flatMap((d: any) =>
    (d.projectRoles ?? []).map((pr: any) => pr.roleId)
  );

  const roles = roleIds.length
    ? await Role.find({ _id: { $in: roleIds } })
        .select("name")
        .lean()
    : [];

  const roleMap = new Map(
    roles.map((r: any) => [String(r._id), r.name as string])
  );

  const rows = docs.map((d: any) => {
    const names = (d.projectRoles ?? [])
      .map((pr: any) => roleMap.get(String(pr.roleId)))
      .filter(Boolean);

    return {
      ID: String(d._id),
      Name: d.name,
      Email: d.email,
      Roles: names.length ? names.join(", ") : d.role,
      Status: d.isActive ?? true ? "Active" : "Blocked",
      "Last Login": d.lastLoginAt
        ? new Date(d.lastLoginAt).toISOString()
        : "",
      "Created At": d.createdAt
        ? new Date(d.createdAt).toISOString()
        : "",
    };
  });

  const parser = new Parser({
    fields: [
      "ID",
      "Name",
      "Email",
      "Roles",
      "Status",
      "Last Login",
      "Created At",
    ],
  });

  return parser.parse(rows);
}

export async function getRolesReport(q: ReportQuery) {
  const { projectId, range, status } = q;

  const userMatch: Record<string, unknown>[] = [];

  const days = RANGE_DAYS[range];
  if (days) {
    userMatch.push({
      createdAt: {
        $gte: new Date(Date.now() - days * 86400000),
      },
    });
  }

  if (status === "active") {
    userMatch.push({ isActive: true });
  }

  if (status === "inactive" || status === "blocked") {
    userMatch.push({ isActive: false });
  }

  const userFilter = userMatch.length
    ? { $and: userMatch }
    : {};

  const pipeline: any[] = [
    { $match: userFilter },

    { $unwind: "$projectRoles" },

    ...(projectId
      ? [
          {
            $match: {
              "projectRoles.projectId": new Types.ObjectId(projectId),
              "projectRoles.isActive": true,
            },
          },
        ]
      : [
          {
            $match: {
              "projectRoles.isActive": true,
            },
          },
        ]),

    {
      $lookup: {
        from: "roles",
        localField: "projectRoles.roleId",
        foreignField: "_id",
        as: "role",
      },
    },

    {
      $unwind: {
        path: "$role",
        preserveNullAndEmptyArrays: false,
      },
    },

    {
      $group: {
        _id: {
          roleId: "$role._id",
          roleName: "$role.name",
        },

        userCount: {
          $sum: 1,
        },

        activeUsers: {
          $sum: {
            $cond: [{ $eq: ["$isActive", true] }, 1, 0],
          },
        },

        blockedUsers: {
          $sum: {
            $cond: [{ $eq: ["$isActive", false] }, 1, 0],
          },
        },
      },
    },

    {
      $sort: {
        userCount: -1,
      },
    },
  ];

  const roles = await User.aggregate(pipeline);

  const totalUsers = roles.reduce(
    (sum, role) => sum + role.userCount,
    0
  );

  return {
    totalUsers,
    roles: roles.map((role) => ({
      roleId: String(role._id.roleId),
      roleName: role._id.roleName,
      userCount: role.userCount,
      activeUsers: role.activeUsers,
      blockedUsers: role.blockedUsers,
    })),
  };
}