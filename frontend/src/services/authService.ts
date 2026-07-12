import {
  LoginRequest,
  RegisterRequest,
  LoginResponse,
  RegisterResult,
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
    VERIFY_EMAIL: '/auth/verify-email',
    RESEND_VERIFICATION: '/auth/resend-verification',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
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

  static async register(creds: RegisterRequest): Promise<RegisterResult> {
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

  static async verifyEmail(token: string): Promise<{ message: string }> {
    try {
      const response = await apiService.post(authService.ENDPOINTS.VERIFY_EMAIL, {
        token,
      });
      return response.data;
    } catch (error) {
      throw this.handleAuthError(error, 'Failed to verify email');
    }
  }

  static async resendVerification(email: string): Promise<{ message: string }> {
    try {
      const response = await apiService.post(
        authService.ENDPOINTS.RESEND_VERIFICATION,
        { email }
      );
      return response.data;
    } catch (error) {
      throw this.handleAuthError(error, 'Failed to resend verification email');
    }
  }

  static async forgotPassword(email: string): Promise<{ message: string }> {
    try {
      const response = await apiService.post(
        authService.ENDPOINTS.FORGOT_PASSWORD,
        { email }
      );
      return response.data;
    } catch (error) {
      throw this.handleAuthError(error, 'Failed to send password reset email');
    }
  }

  static async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ message: string }> {
    try {
      const response = await apiService.post(
        authService.ENDPOINTS.RESET_PASSWORD,
        { token, new_password: newPassword }
      );
      return response.data;
    } catch (error) {
      throw this.handleAuthError(error, 'Failed to reset password');
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
