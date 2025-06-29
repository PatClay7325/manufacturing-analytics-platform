import apiService from './apiService';

/**
 * Interface for user information
 */
export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
  department?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface for login credentials
 */
export interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * Interface for login response
 */
export interface LoginResponse {
  user: User;
  token: string;
  expiresAt: number;
  refreshToken: string;
}

/**
 * Interface for registration data
 */
export interface RegistrationData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  department?: string;
}

/**
 * Interface for password reset request
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Interface for password reset confirmation
 */
export interface PasswordResetConfirmation {
  token: string;
  password: string;
}

/**
 * Interface for refresh token request
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Auth API Service
 * 
 * Provides methods for interacting with the authentication API endpoints
 */
export class AuthApiService {
  private resource = 'auth';

  /**
   * Log in a user
   */
  async login(email: string, password: string, remember?: boolean): Promise<LoginResponse> {
    return apiService.post<LoginResponse>({
      endpoint: '/auth/login'
    }, { email, password, remember });
  }

  /**
   * Register a new user
   */
  async register(data: any): Promise<{ user: User }> {
    const result = await apiService.post<User>({
      endpoint: '/auth/register'
    }, data);
    return { user: result };
  }

  /**
   * Log out a user
   */
  async logout(): Promise<void> {
    await apiService.post({
      endpoint: '/auth/logout'
    });
  }

  /**
   * Request a password reset
   */
  async requestPasswordReset(request: PasswordResetRequest): Promise<{ message: string }> {
    return apiService.post<{ message: string }>({
      resource: this.resource,
      endpoint: '/password-reset'
    }, request);
  }

  /**
   * Confirm a password reset
   */
  async confirmPasswordReset(confirmation: PasswordResetConfirmation): Promise<{ message: string }> {
    return apiService.post<{ message: string }>({
      resource: this.resource,
      endpoint: '/password-reset/confirm'
    }, confirmation);
  }

  /**
   * Get the current user
   */
  async getCurrentUser(): Promise<User> {
    return apiService.get<User>({
      endpoint: '/auth/me',
      cache: { ttl: 5 * 60 * 1000 } // Cache for 5 minutes
    });
  }

  /**
   * Refresh an access token
   */
  async refreshToken(): Promise<{ user: User; token: string; expiresAt: number }> {
    const refreshToken = localStorage.getItem('refreshToken');
    const result = await apiService.post<{ user: User; token: string; expiresAt: number }>({
      endpoint: '/auth/refresh-token'
    }, { refreshToken });
    return result;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: Partial<User>): Promise<User> {
    const result = await apiService.put<User>({
      resource: this.resource,
      endpoint: `/users/${userId}`
    }, data);
    
    // Clear cache after modification
    apiService.clearResourceCache(this.resource);
    
    return result;
  }

  /**
   * Change password
   */
  async changePassword(
    currentPassword: string, 
    newPassword: string
  ): Promise<{ message: string }> {
    return apiService.post<{ message: string }>({
      resource: this.resource,
      endpoint: '/change-password'
    }, { currentPassword, newPassword });
  }
}

// Create and export a default instance
export const authApi = new AuthApiService();
export default authApi;
