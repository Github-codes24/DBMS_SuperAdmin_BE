// validators/rbac.ts
import { z } from "zod";

const key = z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9_-]{1,47}$/);
const permKey = z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9_-]{1,47}:[a-z][a-z0-9_-]{1,47}$/);
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);
const projectIdParam = z.string().regex(/^[0-9a-fA-F]{24}$|^PID-\d+$/i, "Invalid project ID");

const panelLinkDto = z.object({
  name: z.string().trim().min(1).max(100),
  url:  z.string().trim().min(1).max(2000),
});

const userTypeDto = z.object({
  role:  z.string().trim().min(1).max(60),
  count: z.number().int().min(0),
});

const projectStatusEnum = z.enum(["active", "inactive", "upcoming", "completed", "on_hold"]);

const optionalDateField = z.preprocess(
  (val) => (typeof val === "string" ? val.trim() : val),
  z
    .union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      z.literal(""),
      z.null(),
      z.undefined(),
    ])
    .optional()
    .transform((val) => (val ? String(val).trim() : ""))
);

const optionalThemeField = z.preprocess(
  (val) => (typeof val === "string" ? val.trim() : val),
  z
    .union([
      z.string().regex(/^#[0-9a-fA-F]{6}$/),
      z.literal(""),
      z.null(),
      z.undefined(),
    ])
    .optional()
    .transform((val) => (val ? String(val).trim() : "#f96321"))
);

const optionalLogoField = z.preprocess(
  (val) => (typeof val === "string" ? val.trim() : val),
  z
    .union([
      z.string().max(10_000_000),
      z.literal(""),
      z.null(),
      z.undefined(),
    ])
    .optional()
    .transform((val) => (val ? String(val).trim() : ""))
);

const optionalStringField = (max = 1000) =>
  z.preprocess(
    (val) => (typeof val === "string" ? val.trim() : val),
    z
      .union([
        z.string().max(max),
        z.literal(""),
        z.null(),
        z.undefined(),
      ])
      .optional()
      .transform((val) => (val ? String(val).trim() : ""))
  );

// export const createProjectDto = z.object({
//   body: z.object({
//     name:        z.string().trim().min(2).max(100),
//     description: optionalStringField(1000),
//     logo:        optionalLogoField,
//     theme:       optionalThemeField,
//     startDate:   optionalDateField,
//     endDate:     optionalDateField,
//     status:      projectStatusEnum.optional().default("active"),
//     adminId:     optionalStringField(200),
//     panelLinks:  z.array(panelLinkDto).max(100).optional().default([]),
//     userTypes:   z.array(userTypeDto).max(100).optional().default([]),
//   }).passthrough(),
//   params: z.object({}).passthrough(),
//   query:  z.object({}).passthrough(),
// });

const projectModuleDto = z
  .object({
    key,
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().max(300).optional(),
    actions: z.array(key).optional(),
  })
  .strict();

const panelDto = z
  .object({
    name: z.string().trim().min(2).max(80),
    modules: z.array(projectModuleDto).min(1).max(100),
  })
  .strict();

export const createProjectDto = z.object({
  body: z
    .object({
      name:        z.string().trim().min(2).max(100),
      description: optionalStringField(1000),
      logo:        optionalLogoField,
      theme:       optionalThemeField,
      startDate:   optionalDateField,
      endDate:     optionalDateField,
      status:      projectStatusEnum.optional().default("active"),
      adminId:     optionalStringField(200),
      panelLinks:  z.array(panelLinkDto).max(100).optional().default([]),
      userTypes:   z.array(userTypeDto).max(100).optional().default([]),
      panels:      z.array(panelDto).max(20).optional().default([]),
    })
    .passthrough()
    .superRefine((b, ctx) => {
      const panelNames = new Set<string>();
      const keys = new Set<string>();
      b.panels.forEach((p, pi) => {
        const pn = p.name.toLowerCase(); // createModules lowercases the panel name
        if (panelNames.has(pn))
          ctx.addIssue({ code: "custom", path: ["panels", pi, "name"], message: "Duplicate panel name" });
        panelNames.add(pn);
        p.modules.forEach((m, mi) => {
          if (keys.has(m.key))
            ctx.addIssue({ code: "custom", path: ["panels", pi, "modules", mi, "key"], message: `Duplicate module key: ${m.key}` });
          keys.add(m.key);
        });
      });
    }),
  params: z.object({}).passthrough(),
  query:  z.object({}).passthrough(),
});


export const updateProjectDto = z.object({
  body: z.object({
    name:        z.string().trim().min(2).max(100).optional(),
    description: optionalStringField(1000),
    logo:        optionalLogoField,
    theme:       optionalThemeField,
    startDate:   optionalDateField,
    endDate:     optionalDateField,
    status:      projectStatusEnum.optional(),
    adminId:     optionalStringField(200),
    panelLinks:  z.array(panelLinkDto).max(100).optional(),
    userTypes:   z.array(userTypeDto).max(100).optional(),
  }).passthrough(),
  params: z.object({ projectId: projectIdParam }).passthrough(),
  query:  z.object({}).passthrough(),
});

export const createRoleDto = z.object({
  body: z.object({
    name:        z.string().trim().min(2).max(60),
    description: z.string().trim().max(300).optional(),
    moduleKeys:  z.array(key).max(200).default([]),
  }).strict(),
  params: z.object({ projectId: objectId }).strict(),
  query:  z.object({}).strict(),
});

export const updateRoleDto = z.object({
  body: z.object({
    name:        z.string().trim().min(2).max(60).optional(),
    description: z.string().trim().max(300).optional(),
    moduleKeys:  z.array(key).max(200).optional(),
    isActive:    z.boolean().optional(),
  }).strict(),
  params: z.object({ projectId: objectId, roleId: objectId }).strict(),
  query:  z.object({}).strict(),
});

export const savePermissionsDto = z.object({
  body: z.object({
    expectedVersion: z.number().int().min(1),
    permissions:     z.array(permKey).max(1000),
  }).strict(),
  params: z.object({ projectId: objectId, roleId: objectId }).strict(),
  query:  z.object({}).strict(),
});

export const bulkModulesDto = z.object({
  body: z.object({
    modules: z.array(
      z.object({
        key,
        name: z.string().trim().min(2).max(80),
        description: z.string().trim().max(300).optional(),
        actions: z.array(key).optional(),
        panel: z.string().trim().min(2).max(80),
      }).strict(),
    ).min(1).max(100),
  }).strict(),

  params: z.object({
    projectId: objectId,
  }).strict(),

  query: z.object({}).strict(),
});

export const listModulesByPanelDto = z.object({
  body: z.object({}).passthrough(),
  params: z.object({ projectId: objectId }).strict(),
  query: z.object({ panel: z.string().trim().min(2).max(80).optional() }).strict(),
});

export const updateModuleDto = z.object({
  body: z.object({
    name:        z.string().trim().min(2).max(80).optional(),
    description: z.string().trim().max(300).optional(),
    sortOrder:   z.number().int().optional(),
    isActive:    z.boolean().optional(),
  }).strict(),
  params: z.object({ projectId: objectId, moduleId: objectId }).strict(),
  query:  z.object({}).strict(),
});

export const moduleActionsDto = z.object({
  body:   z.object({ actions: z.array(key).min(1) }).strict(),
  params: z.object({ projectId: objectId, moduleId: objectId }).strict(),
  query:  z.object({}).strict(),
});

export const createActionDto = z.object({
  body: z.object({
    key,
    label:             z.string().trim().min(2).max(40),
    sortOrder:         z.number().int().optional(),
    applyToAllModules: z.boolean().optional(),
  }).strict(),
  params: z.object({}).strict(),
  query:  z.object({}).strict(),
});

export const updateActionDto = z.object({
  body: z.object({
    label:     z.string().trim().min(2).max(40).optional(),
    sortOrder: z.number().int().optional(),
    isActive:  z.boolean().optional(),
  }).strict(),
  params: z.object({ key: z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9_-]{1,47}$/) }).strict(),
  query:  z.object({}).strict(),
});

export const createProjectUserDto = z.object({
  body: z.object({
    name:     z.string().trim().min(2).max(100),
    email:    z.string().trim().toLowerCase().email(),
    password: z.string().min(8).max(128),
    roleId:   objectId,
  }).strict(),
  params: z.object({ projectId: objectId }).strict(),
  query:  z.object({}).strict(),
});

export const assignRoleDto = z.object({
  body: z.object({
    roleId: objectId,
  }).strict(),

  params: z.object({
    projectId: objectId,
    userId: objectId,
  }).strict(),

  query: z.object({}).strict(),
});
export const activeDto     = z.object({ isActive: z.boolean() }).strict();
