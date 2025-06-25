// Export base API service
export { default as apiService } from './apiService';

// Export resource-specific API services
export { default as equipmentApi } from './equipmentApi';
export { default as alertApi } from './alertApi';
export { default as chatApi } from './chatApi';
export { default as metricsApi } from './metricsApi';
export { default as authApi } from './authApi';
export { default as userApi } from './userApi';

// Export error types
export { 
  HttpError, 
  NetworkError, 
  TimeoutError,
  ApiError
} from './apiService';