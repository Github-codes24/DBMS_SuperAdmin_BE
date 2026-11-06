// validators/rbac.ts
import { z } from "zod";

const key = z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9_-]{1,47}$/);
const permKey = z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9_-]{1,47}:[a-z][a-z0-9_-]{1,47}$/);
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

const panelLinkDto = z.object({
  name: z.string().trim().min(1).max(100),
  url:  z.string().trim().min(1).max(2000),
});

const userTypeDto = z.object({
  role:  z.string().trim().min(1).max(60),
  count: z.number().int().min(0),
});

const projectStatusEnum = z.enum(["active", "inactive", "upcoming", "completed", "on_hold"]);

export const createProjectDto = z.object({
  body: z.object({
    name:        z.string().trim().min(2).max(100),
    description: z.string().trim().max(500).optional(),
    logo:        z.string().trim().max(2000).optional(),
    theme:       z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional().or(z.literal("")),
    startDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
    endDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
    status:      projectStatusEnum.optional(),
    adminId:     z.string().optional(),
    panelLinks:  z.array(panelLinkDto).max(100).optional(),
    userTypes:   z.array(userTypeDto).max(100).optional(),
  }).strict(),
  params: z.object({}).strict(),
  query:  z.object({}).strict(),
});

export const updateProjectDto = z.object({
  body: z.object({
    name:        z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(500).optional(),
    logo:        z.string().trim().max(2000).optional(),
    theme:       z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional().or(z.literal("")),
    startDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
    endDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
    status:      projectStatusEnum.optional(),
    adminId:     z.string().optional(),
    panelLinks:  z.array(panelLinkDto).max(100).optional(),
    userTypes:   z.array(userTypeDto).max(100).optional(),
  }).strict(),
  params: z.object({ projectId: objectId }).strict(),
  query:  z.object({}).strict(),
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
        name:        z.string().trim().min(2).max(80),
        description: z.string().trim().max(300).optional(),
        actions:     z.array(key).optional(),
      }).strict(),
    ).min(1).max(100),
  }).strict(),
  params: z.object({ projectId: objectId }).strict(),
  query:  z.object({}).strict(),
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

export const assignRoleDto = z.object({ roleId: objectId }).strict();
export const activeDto     = z.object({ isActive: z.boolean() }).strict();
