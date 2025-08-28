import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { tokenService } from './tokenService';
import { API_BASE_URL } from '../utils/constants';

interface QueuedRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  config: AxiosRequestConfig;
}

class ApiService {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<QueuedRequest> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = tokenService.getAccessToken();
        if (token) {
          config.headers = config.headers || {};
          (config.headers as any)['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & {
          _retry?: boolean;
        };

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Add request to queue
            return new Promise((resolve, reject) => {
              this.failedQueue.push({
                resolve,
                reject,
                config: originalRequest,
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = tokenService.getRefreshToken();
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              token: refreshToken,
            });
            const { access_token, refresh_token } = response.data;
            tokenService.setTokens(access_token, refresh_token);

            // Process queued Requests
            this.processQueue(null, access_token);

            // Retry original request
            if (originalRequest.headers) {
              (originalRequest.headers as any)['Authorization'] =
                `Bearer ${access_token}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            tokenService.clearTokens();

            // Redirect to login or emit logout event
            window.location.href = '/login';
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Process failed requests
  private processQueue(error: any, token: string | null = null): void {
    this.failedQueue.forEach(({ resolve, reject, config }) => {
      if (error) {
        reject(error);
      } else {
        if (config.headers && token) {
          (config.headers as any)['Authorization'] = `Bearer ${token}`;
        }
        resolve(this.client(config));
      }
    });

    this.failedQueue = [];
  }

  // Expose axios methods with proper typing
  get<T = any>(url: string, config?: AxiosRequestConfig) {
    return this.client.get<T>(url, config);
  }

  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    console.log('ApiService.post called with', { url, data, config });
    return this.client.post<T>(url, data, config);
  }

  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.put<T>(url, data, config);
  }

  delete<T = any>(url: string, config?: AxiosRequestConfig) {
    return this.client.delete<T>(url, config);
  }
}

export const apiService = new ApiService();
