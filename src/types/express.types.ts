import { Types } from "mongoose";

export interface AuthUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  role: "superadmin" | "user";
  projectRoles: { projectId: Types.ObjectId; roleId: Types.ObjectId; isActive: boolean }[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}