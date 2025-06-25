// User Management Types
export interface User {
  id: string;
  email: string;
  name?: string | null;
  username?: string | null;
  role: UserRole;
  department?: string | null;
  passwordHash: string;
  lastLogin?: Date | null;
  lastLoginAt?: Date | null;
  isActive: boolean;
  organizationId?: string | null;
  siteId?: string | null;
  teamId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relationships
  Site?: Site | null;
  Team?: Team | null;
  TeamMembers?: TeamMember[];
  ApiKeys?: ApiKey[];
  roles?: UserRoleAssignment[];
  permissions?: UserPermissionAssignment[];
}

export interface CreateUserRequest {
  email: string;
  name?: string;
  username?: string;
  password: string;
  role: UserRole;
  department?: string;
  siteId?: string;
  teamIds?: string[];
  isActive?: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  name?: string;
  username?: string;
  role?: UserRole;
  department?: string;
  siteId?: string;
  teamIds?: string[];
  isActive?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordRequest {
  email: string;
  token?: string;
  newPassword?: string;
}

// Team Management Types
export interface Team {
  id: string;
  name: string;
  description?: string | null;
  siteId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relationships
  Site?: Site | null;
  Users?: User[];
  TeamMembers?: TeamMember[];
  memberCount?: number;
  permissions?: string[];
}

export interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: TeamRole;
  joinedAt: Date;
  
  // Relationships
  User: User;
  Team: Team;
}

export interface CreateTeamRequest {
  name: string;
  description?: string;
  siteId?: string;
  memberEmails?: string[];
  permissions?: string[];
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  siteId?: string;
  permissions?: string[];
}

export interface AddTeamMemberRequest {
  userIds?: string[];
  userEmails?: string[];
  role?: TeamRole;
}

export interface UpdateTeamMemberRequest {
  role: TeamRole;
}

// Role and Permission Types
export type UserRole = 
  | 'admin'
  | 'manager' 
  | 'engineer'
  | 'supervisor'
  | 'quality_analyst'
  | 'technician'
  | 'operator'
  | 'viewer'
  | 'user';

export type TeamRole = 'admin' | 'member';

export interface Role {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Relationships
  users?: UserRoleAssignment[];
  permissions?: RolePermissionAssignment[];
}

export interface Permission {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Relationships
  roles?: RolePermissionAssignment[];
  users?: UserPermissionAssignment[];
}

export interface UserRoleAssignment {
  userId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy?: string | null;
  
  // Relationships
  user: User;
  role: Role;
}

export interface UserPermissionAssignment {
  userId: string;
  permissionId: string;
  grantedAt: Date;
  grantedBy?: string | null;
  
  // Relationships
  user: User;
  permission: Permission;
}

export interface RolePermissionAssignment {
  roleId: string;
  permissionId: string;
  assignedAt: Date;
  assignedBy?: string | null;
  
  // Relationships
  role: Role;
  permission: Permission;
}

// API Response Types
export interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TeamsResponse {
  teams: Team[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserSearchFilters {
  search?: string;
  role?: UserRole;
  department?: string;
  siteId?: string;
  teamId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'email' | 'role' | 'createdAt' | 'lastLogin';
  sortOrder?: 'asc' | 'desc';
}

export interface TeamSearchFilters {
  search?: string;
  siteId?: string;
  hasMembers?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'memberCount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// Site and Organization Types (for context)
export interface Site {
  id: string;
  name: string;
  code: string;
  location: string;
  enterpriseId: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Relationships
  Enterprise?: Enterprise;
  Users?: User[];
  Teams?: Team[];
}

export interface Enterprise {
  id: string;
  name: string;
  code: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Relationships
  Sites?: Site[];
}

// API Key Management
export interface ApiKey {
  id: string;
  name: string;
  key: string;
  userId: string;
  permissions: string[];
  expiresAt?: Date | null;
  lastUsedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relationships
  User: User;
}

export interface CreateApiKeyRequest {
  name: string;
  permissions: string[];
  expiresAt?: Date;
}

// Permission Categories
export const PERMISSION_CATEGORIES = {
  USER_MANAGEMENT: 'user_management',
  TEAM_MANAGEMENT: 'team_management',
  DASHBOARD_MANAGEMENT: 'dashboard_management',
  ALERT_MANAGEMENT: 'alert_management',
  EQUIPMENT_MANAGEMENT: 'equipment_management',
  SYSTEM_MANAGEMENT: 'system_management',
  DATA_ACCESS: 'data_access',
} as const;

// Standard Permissions
export const PERMISSIONS = {
  // User Management
  'manage:users': 'Full user management access',
  'create:users': 'Create new users',
  'edit:users': 'Edit user information',
  'delete:users': 'Delete users',
  'view:users': 'View user list and details',
  'edit:user:roles': 'Assign and modify user roles',
  
  // Team Management
  'manage:teams': 'Full team management access',
  'create:teams': 'Create new teams',
  'edit:teams': 'Edit team information',
  'delete:teams': 'Delete teams',
  'view:teams': 'View team list and details',
  'manage:team:members': 'Add and remove team members',
  
  // Dashboard Management
  'manage:dashboards': 'Full dashboard management access',
  'create:dashboards': 'Create new dashboards',
  'edit:dashboards': 'Edit dashboards',
  'delete:dashboards': 'Delete dashboards',
  'view:dashboards': 'View dashboards',
  'share:dashboards': 'Share dashboards with others',
  
  // Alert Management
  'manage:alerts': 'Full alert management access',
  'create:alerts': 'Create alert rules',
  'edit:alerts': 'Edit alert rules',
  'delete:alerts': 'Delete alert rules',
  'view:alerts': 'View alerts and alert history',
  'acknowledge:alerts': 'Acknowledge alerts',
  
  // Equipment Management
  'manage:equipment': 'Full equipment management access',
  'edit:equipment': 'Edit equipment information',
  'view:equipment': 'View equipment list and details',
  'update:equipment:status': 'Update equipment status',
  
  // System Management
  'manage:settings': 'Manage system settings',
  'manage:integrations': 'Manage system integrations',
  'view:audit:logs': 'View audit logs',
  'manage:api:keys': 'Manage API keys',
  
  // Data Access
  'view:all:data': 'Access all data across organization',
  'view:site:data': 'Access data for assigned site only',
  'view:team:data': 'Access data for team members only',
  'view:own:data': 'Access only own data',
} as const;

// Role Definitions with Default Permissions
export const ROLE_DEFINITIONS: Record<UserRole, {
  label: string;
  description: string;
  permissions: (keyof typeof PERMISSIONS)[];
  level: number;
}> = {
  admin: {
    label: 'Administrator',
    description: 'Full system access with all permissions',
    permissions: Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[],
    level: 100,
  },
  manager: {
    label: 'Manager',
    description: 'Management access with team and dashboard permissions',
    permissions: [
      'view:users', 'manage:teams', 'create:teams', 'edit:teams', 'view:teams',
      'manage:team:members', 'manage:dashboards', 'create:dashboards', 'edit:dashboards',
      'delete:dashboards', 'view:dashboards', 'share:dashboards', 'manage:alerts',
      'create:alerts', 'edit:alerts', 'delete:alerts', 'view:alerts', 'acknowledge:alerts',
      'manage:equipment', 'edit:equipment', 'view:equipment', 'update:equipment:status',
      'view:all:data'
    ],
    level: 80,
  },
  engineer: {
    label: 'Engineer',
    description: 'Engineering access with dashboard and equipment permissions',
    permissions: [
      'view:teams', 'create:dashboards', 'edit:dashboards', 'view:dashboards',
      'share:dashboards', 'create:alerts', 'edit:alerts', 'view:alerts',
      'acknowledge:alerts', 'edit:equipment', 'view:equipment', 'update:equipment:status',
      'view:site:data'
    ],
    level: 70,
  },
  supervisor: {
    label: 'Supervisor',
    description: 'Supervisory access with alert and equipment monitoring',
    permissions: [
      'view:teams', 'view:dashboards', 'view:alerts', 'acknowledge:alerts',
      'view:equipment', 'update:equipment:status', 'view:team:data'
    ],
    level: 60,
  },
  quality_analyst: {
    label: 'Quality Analyst',
    description: 'Quality-focused access with specialized dashboard permissions',
    permissions: [
      'view:dashboards', 'view:alerts', 'view:equipment', 'view:site:data'
    ],
    level: 50,
  },
  technician: {
    label: 'Technician',
    description: 'Technical access with equipment and maintenance permissions',
    permissions: [
      'view:dashboards', 'view:alerts', 'acknowledge:alerts', 'view:equipment',
      'update:equipment:status', 'view:team:data'
    ],
    level: 40,
  },
  operator: {
    label: 'Operator',
    description: 'Operational access with monitoring and alert acknowledgment',
    permissions: [
      'view:dashboards', 'view:alerts', 'acknowledge:alerts', 'view:equipment',
      'update:equipment:status', 'view:own:data'
    ],
    level: 30,
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only access to dashboards and equipment status',
    permissions: [
      'view:dashboards', 'view:alerts', 'view:equipment', 'view:own:data'
    ],
    level: 20,
  },
  user: {
    label: 'User',
    description: 'Basic user access with limited permissions',
    permissions: [
      'view:own:data'
    ],
    level: 10,
  },
};

// Utility Types
export type UserWithTeams = User & {
  TeamMembers: (TeamMember & { Team: Team })[];
};

export type TeamWithMembers = Team & {
  TeamMembers: (TeamMember & { User: Pick<User, 'id' | 'name' | 'email' | 'role'> })[];
};

export type UserWithPermissions = User & {
  roles: (UserRoleAssignment & { role: Role & { permissions: (RolePermissionAssignment & { permission: Permission })[] } })[];
  permissions: (UserPermissionAssignment & { permission: Permission })[];
};

// Form Validation Schemas (for client-side validation)
export interface UserFormValidation {
  email: {
    required: boolean;
    pattern: RegExp;
    message: string;
  };
  name: {
    required: boolean;
    minLength: number;
    maxLength: number;
  };
  password: {
    required: boolean;
    minLength: number;
    pattern: RegExp;
    message: string;
  };
  role: {
    required: boolean;
    options: UserRole[];
  };
}

export interface TeamFormValidation {
  name: {
    required: boolean;
    minLength: number;
    maxLength: number;
  };
  description: {
    maxLength: number;
  };
}

// Default validation rules
export const USER_VALIDATION: UserFormValidation = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
  },
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  password: {
    required: true,
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    message: 'Password must contain at least 8 characters with uppercase, lowercase, number, and special character',
  },
  role: {
    required: true,
    options: Object.keys(ROLE_DEFINITIONS) as UserRole[],
  },
};

export const TEAM_VALIDATION: TeamFormValidation = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  description: {
    maxLength: 500,
  },
};