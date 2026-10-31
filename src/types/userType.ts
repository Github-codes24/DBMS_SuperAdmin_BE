interface ProjectRoleInput { projectId: string; roleId: string }

interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  isActive?: boolean;
  projectRoles?: ProjectRoleInput[];
}

interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  isActive?: boolean;
  projectRoles?: ProjectRoleInput[];
}