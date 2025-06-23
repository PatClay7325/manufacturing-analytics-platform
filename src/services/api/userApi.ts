import apiService from './apiService';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  department?: string;
  lastActive?: string;
  createdAt: string;
}

interface CreateUserData {
  email: string;
  name: string;
  role: string;
  department?: string;
}

interface UpdateUserData {
  name?: string;
  role?: string;
  department?: string;
}

/**
 * User API Service
 * 
 * Provides methods for interacting with the user management API endpoints
 */
export class UserApiService {
  private resource = 'users';

  /**
   * Get all users
   */
  async getAllUsers(): Promise<User[]> {
    return apiService.get<User[]>({
      resource: this.resource,
      cache: { ttl: 5 * 60 * 1000 } // Cache for 5 minutes
    });
  }

  /**
   * Get user by ID
   */
  async getUser(id: string): Promise<User> {
    return apiService.get<User>({
      resource: this.resource,
      id,
      cache: { ttl: 5 * 60 * 1000 }
    });
  }

  /**
   * Create new user
   */
  async createUser(userData: CreateUserData): Promise<User> {
    return apiService.post<User>({
      resource: this.resource,
      data: userData
    });
  }

  /**
   * Update user
   */
  async updateUser(id: string, userData: UpdateUserData): Promise<User> {
    return apiService.put<User>({
      resource: this.resource,
      id,
      data: userData
    });
  }

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<void> {
    return apiService.delete({
      resource: this.resource,
      id
    });
  }

  /**
   * Search users
   */
  async searchUsers(query: string): Promise<User[]> {
    return apiService.get<User[]>({
      resource: this.resource,
      endpoint: '/search',
      params: { q: query }
    });
  }
}

// Export singleton instance
const userApi = new UserApiService();
export default userApi;
export { userApi };
