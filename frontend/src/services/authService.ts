import {
  LoginRequest,
  RegisterRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  User,
} from '../types/auth';
import { apiService } from './apiService';
import { API_BASE_URL } from '../utils/constants';
import axios from 'axios';
import { access } from 'fs';

export class authService {
  private static readonly ENDPOINTS = {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    USER: '/auth/user',
    LOGOUT: '/auth/logout',
  } as const;

  static async login(creds: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await apiService.post(
        API_BASE_URL + authService.ENDPOINTS.LOGIN,
        creds
      );
      console.log('Login response:', response.data);
      return response.data;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  static async register(creds: RegisterRequest): Promise<LoginResponse> {
    try {
      const response = await apiService.post(
        authService.ENDPOINTS.REGISTER,
        creds
      );
      return response.data;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  static async refreshToken(
    refreshToken: RefreshTokenRequest
  ): Promise<RefreshTokenResponse> {
    try {
      const response = await apiService.post(authService.ENDPOINTS.REFRESH, {
        refresh_token: refreshToken.refresh_token,
        token_type: 'bearer',
      });
      return response.data;
    } catch (error) {
      throw this.handleAuthError(error, 'token refresh failed');
    }
  }

  static async logout(accessToken: string): Promise<void> {
    try {
      const response = await apiService.post(authService.ENDPOINTS.LOGOUT, {
        access_token: accessToken,
        token_type: 'bearer',
      });
      return response.data;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  static async getCurrentUser(accessToken: string): Promise<User> {
    try {
      const response = await apiService.post<User>(this.ENDPOINTS.USER, {
        access_token: accessToken,
        token_type: 'bearer',
      });
      return response.data;
    } catch (error) {
      throw this.handleAuthError(error, 'Failed to fetch profile');
    }
  }

  private static handleAuthError(
    error: any,
    defaultMessage = 'Authentication failed'
  ): Error {
    if (error.response?.data?.detail) {
      return new Error(error.response.data.detail);
    }
    if (error.message) {
      return new Error(error.message);
    }
    return new Error(defaultMessage);
  }
}
