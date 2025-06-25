import { User } from '@/services/api/authApi';

// Mock users data
const users: User[] = [
  {
    id: 'user-1',
    username: 'john.doe',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'operator',
    permissions: ['view:equipment', 'view:alerts', 'acknowledge:alerts'],
    department: 'Production',
    avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    createdAt: '2023-01-15T08:30:00Z',
    updatedAt: '2023-05-10T14:45:00Z'
  },
  {
    id: 'user-2',
    username: 'jane.smith',
    email: 'jane.smith@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'supervisor',
    permissions: [
      'view:equipment', 
      'view:alerts', 
      'acknowledge:alerts', 
      'resolve:alerts', 
      'view:reports', 
      'manage:users'
    ],
    department: 'Production',
    avatar: 'https://randomuser.me/api/portraits/women/2.jpg',
    createdAt: '2022-11-08T09:15:00Z',
    updatedAt: '2023-04-22T11:30:00Z'
  },
  {
    id: 'user-3',
    username: 'alex.tech',
    email: 'alex.tech@example.com',
    firstName: 'Alex',
    lastName: 'Chen',
    role: 'technician',
    permissions: [
      'view:equipment', 
      'edit:equipment', 
      'view:alerts', 
      'acknowledge:alerts', 
      'resolve:alerts'
    ],
    department: 'Maintenance',
    avatar: 'https://randomuser.me/api/portraits/men/3.jpg',
    createdAt: '2022-09-20T14:00:00Z',
    updatedAt: '2023-06-05T16:20:00Z'
  },
  {
    id: 'user-4',
    username: 'maria.rodriguez',
    email: 'maria.rodriguez@example.com',
    firstName: 'Maria',
    lastName: 'Rodriguez',
    role: 'engineer',
    permissions: [
      'view:equipment',
      'edit:equipment',
      'view:alerts',
      'acknowledge:alerts',
      'resolve:alerts',
      'view:reports',
      'view:maintenance'
    ],
    department: 'Engineering',
    avatar: 'https://randomuser.me/api/portraits/women/4.jpg',
    createdAt: '2022-10-15T11:45:00Z',
    updatedAt: '2023-05-28T09:10:00Z'
  },
  {
    id: 'user-5',
    username: 'david.miller',
    email: 'david.miller@example.com',
    firstName: 'David',
    lastName: 'Miller',
    role: 'manager',
    permissions: [
      'view:equipment',
      'edit:equipment',
      'view:alerts',
      'acknowledge:alerts',
      'resolve:alerts',
      'view:reports',
      'edit:reports',
      'manage:users',
      'view:maintenance',
      'schedule:maintenance',
      'admin:settings'
    ],
    department: 'Operations',
    avatar: 'https://randomuser.me/api/portraits/men/5.jpg',
    createdAt: '2022-08-10T10:30:00Z',
    updatedAt: '2023-06-01T15:45:00Z'
  },
  {
    id: 'user-6',
    username: 'lisa.wong',
    email: 'lisa.wong@example.com',
    firstName: 'Lisa',
    lastName: 'Wong',
    role: 'quality_analyst',
    permissions: [
      'view:equipment',
      'view:alerts',
      'acknowledge:alerts',
      'view:reports',
      'view:quality',
      'edit:quality'
    ],
    department: 'Quality Assurance',
    avatar: 'https://randomuser.me/api/portraits/women/6.jpg',
    createdAt: '2022-12-05T13:20:00Z',
    updatedAt: '2023-05-15T10:30:00Z'
  },
  {
    id: 'user-7',
    username: 'admin',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    permissions: ['*'], // All permissions
    createdAt: '2022-01-01T00:00:00Z',
    updatedAt: '2023-06-10T08:00:00Z'
  }
];

// Mock login responses
const loginResponses: Record<string, { user: User; token: string; expiresAt: number; refreshToken: string }> = {
  'john.doe': {
    user: users.find(u => u.username === 'john.doe')!,
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEiLCJyb2xlIjoib3BlcmF0b3IiLCJleHAiOjE3MTczMjYyMDh9.t0JvR7RLgAw56ItGg7BgX8_YwdC5-MAWsXlgMCcBJ9A',
    expiresAt: Date.now() + 3600000, // 1 hour from now
    refreshToken: 'refresh-token-john-doe-123'
  },
  'jane.smith': {
    user: users.find(u => u.username === 'jane.smith')!,
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTIiLCJyb2xlIjoic3VwZXJ2aXNvciIsImV4cCI6MTcxNzMyNjIwOH0.uxZbp9HaUy_EFYT_mNvkEY9A_i7q1Md5n2JM0cdsaAg',
    expiresAt: Date.now() + 3600000, // 1 hour from now
    refreshToken: 'refresh-token-jane-smith-456'
  },
  'admin': {
    user: users.find(u => u.username === 'admin')!,
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTciLCJyb2xlIjoiYWRtaW4iLCJleHAiOjE3MTczMjYyMDh9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    expiresAt: Date.now() + 3600000, // 1 hour from now
    refreshToken: 'refresh-token-admin-789'
  }
};

// Export all mock user data
export const mockUserData = {
  users,
  loginResponses
};