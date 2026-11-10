interface ProjectRoleInput { projectId: string; roleId: string }

interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
<<<<<<< HEAD
  role?: "superadmin" | "user";
=======
  role?: string;
>>>>>>> develop
  isActive?: boolean;
  projectRoles?: ProjectRoleInput[];
  projectIds?: string[];
}

interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  phoneNumber?: string;
<<<<<<< HEAD
  role?: "superadmin" | "user";
=======
  role?: string;
>>>>>>> develop
  isActive?: boolean;
  projectRoles?: ProjectRoleInput[];
  projectIds?: string[];
}