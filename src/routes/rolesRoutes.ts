
// import { Router } from "express";
// import {
//   assignRoleToUser,
//   createRole,
//   getMyRoles,

// } from "../controllers/roleController.js";
// import { authenticate } from "../middleware/authenticate.js";
// import { requireSuperAdmin } from "../middleware/requireSuperAdmin.js";

// const router = Router();

// // router.use(authenticate, requireSuperAdmin);

// // router.post("/", createRole);
// // router.get("/", getRoles);
// // router.patch("/:id", updateRole);

// // SuperAdmin or Project Admin
// router.post(
//   "/:projectId/roles",
//   authenticate,
//   createRole,                // the new controller above
// );
// // router.get(
// //   "/:projectId/roles",
// //   authenticate,
// //   getRolesByProject,
// // );

// router.post(
//   "/:projectId/users/:userId/assign-role",
//   authenticate,
//   assignRoleToUser,
// );
// router.get("/me/roles", authenticate, getMyRoles);

// export default router;
