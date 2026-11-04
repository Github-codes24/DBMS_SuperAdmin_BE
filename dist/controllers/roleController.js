"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.savePermissions = exports.getMatrix = exports.deleteRole = exports.updateRole = exports.getRole = exports.listRoles = exports.createRole = void 0;
// controllers/role.controller.ts
const svc = __importStar(require("../services/roleService"));
const request_js_1 = require("../utils/request.js");
const helpers_js_1 = require("./helpers.js");
exports.createRole = (0, helpers_js_1.wrap)(async (req, res) => (0, helpers_js_1.ok)(res, await svc.createRole((0, request_js_1.param)(req, "projectId"), req.body, (0, request_js_1.actorId)(req)), 201));
exports.listRoles = (0, helpers_js_1.wrap)(async (req, res) => (0, helpers_js_1.ok)(res, await svc.getRolesByProject((0, request_js_1.param)(req, "projectId"))));
exports.getRole = (0, helpers_js_1.wrap)(async (req, res) => (0, helpers_js_1.ok)(res, await svc.getRoleById((0, request_js_1.param)(req, "projectId"), (0, request_js_1.param)(req, "roleId"))));
exports.updateRole = (0, helpers_js_1.wrap)(async (req, res) => (0, helpers_js_1.ok)(res, await svc.updateRole((0, request_js_1.param)(req, "projectId"), (0, request_js_1.param)(req, "roleId"), req.body, (0, request_js_1.actorId)(req))));
exports.deleteRole = (0, helpers_js_1.wrap)(async (req, res) => (0, helpers_js_1.ok)(res, await svc.deleteRole((0, request_js_1.param)(req, "projectId"), (0, request_js_1.param)(req, "roleId"), (0, request_js_1.actorId)(req))));
exports.getMatrix = (0, helpers_js_1.wrap)(async (req, res) => (0, helpers_js_1.ok)(res, await svc.getMatrix((0, request_js_1.param)(req, "projectId"), (0, request_js_1.param)(req, "roleId"))));
exports.savePermissions = (0, helpers_js_1.wrap)(async (req, res) => (0, helpers_js_1.ok)(res, await svc.savePermissions((0, request_js_1.param)(req, "projectId"), (0, request_js_1.param)(req, "roleId"), req.body.permissions, req.body.expectedVersion, (0, request_js_1.actorId)(req))));
//# sourceMappingURL=roleController.js.map