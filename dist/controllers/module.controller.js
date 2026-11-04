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
exports.updateAction = exports.createAction = exports.listActions = exports.setModuleActions = exports.updateModule = exports.createModules = exports.listModules = void 0;
const svc = __importStar(require("../services/module.service.js"));
const request_js_1 = require("../utils/request.js");
const helpers_js_1 = require("./helpers.js");
// Retrieve all modules configured for a specific project.
exports.listModules = (0, helpers_js_1.wrap)(async (req, res) => (0, helpers_js_1.ok)(res, await svc.listModules((0, request_js_1.param)(req, "projectId"))));
// Create multiple modules under a specific project.
exports.createModules = (0, helpers_js_1.wrap)(async (req, res) => (0, helpers_js_1.ok)(res, await svc.createModules((0, request_js_1.param)(req, "projectId"), req.body.modules, (0, request_js_1.actorId)(req)), 201));
// Update a project's module details or active status.
exports.updateModule = (0, helpers_js_1.wrap)(async (req, res) => (0, helpers_js_1.ok)(res, await svc.updateModule((0, request_js_1.param)(req, "projectId"), (0, request_js_1.param)(req, "moduleId"), req.body, (0, request_js_1.actorId)(req))));
// Configure or replace the actions assigned to a specific project module.
exports.setModuleActions = (0, helpers_js_1.wrap)(async (req, res) => (0, helpers_js_1.ok)(res, await svc.setModuleActions((0, request_js_1.param)(req, "projectId"), (0, request_js_1.param)(req, "moduleId"), req.body.actions, (0, request_js_1.actorId)(req))));
// Retrieve all available actions from the global action catalog.
exports.listActions = (0, helpers_js_1.wrap)(async (_req, res) => (0, helpers_js_1.ok)(res, await svc.listActions()));
// Create a new action in the global action catalog.
exports.createAction = (0, helpers_js_1.wrap)(async (req, res) => (0, helpers_js_1.ok)(res, await svc.createAction(req.body, (0, request_js_1.actorId)(req)), 201));
// Update an existing action in the global action catalog.
exports.updateAction = (0, helpers_js_1.wrap)(async (req, res) => (0, helpers_js_1.ok)(res, await svc.updateAction((0, request_js_1.param)(req, "key"), req.body, (0, request_js_1.actorId)(req))));
//# sourceMappingURL=module.controller.js.map