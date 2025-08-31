import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { User, AuthContextType, LoginResponse } from '../types/auth';
import { authService } from '../services/authService';
import { tokenService } from '../services/tokenService';

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (
    username: string,
    password: string
  ): Promise<LoginResponse> => {
    const response = await authService.login({ username: username, password });
    tokenService.setTokens(response.access_token, response.refresh_token);
    setUser(response.user);
    return response;
  };

  const register = async (
    username: string,
    password: string,
    firstname: string,
    lastname: string,
    email: string
  ): Promise<LoginResponse> => {
    const response = await authService.register({
      username: username,
      password: password,
      firstname: firstname,
      lastname: lastname,
      email: email,
    });
    tokenService.setTokens(response.access_token, response.refresh_token);
    setUser(response.user);
    return response;
  };

  const logout = async (): Promise<void> => {
    const accessToken = tokenService.getAccessToken();
    if (accessToken) {
      try {
        await authService.logout(accessToken);
      } catch (error) {
        console.error('Logout failed:', error);
      }
    }
    tokenService.clearTokens();
    setUser(null);
  };

  const getValidAccessToken = async (): Promise<string | null> => {
    let accessToken = tokenService.getAccessToken();
    console.log('AuthContext: Current access token:', accessToken);
    if (!accessToken || tokenService.isTokenExpired(accessToken)) {
      console.log(
        'AuthContext: Current access token:',
        accessToken,
        ' missing, attempting to refresh'
      );

      const refreshToken = tokenService.getRefreshToken();
      if (!refreshToken) {
        console.warn('No refresh token available, logging out');
        await logout();
        return null;
      } else if (tokenService.isTokenExpired(refreshToken)) {
        console.warn('Refresh token expired, logging out');
        await logout();
        return null;
      }

      try {
        console.log('Refreshing access token: ', refreshToken);
        const response = await authService.refreshToken({
          refresh_token: refreshToken,
        });
        tokenService.setTokens(response.access_token, response.refresh_token);
        accessToken = response.access_token;
      } catch (error) {
        console.error('Failed to refresh access token:', error);
        await logout();
        return null;
      }
    }
    console.log('Valid access token:', accessToken);
    return accessToken;
  };

  // Initialize user state
  useEffect(() => {
    const initializeAuth = async (): Promise<void> => {
      try {
        const token = await getValidAccessToken();
        if (token) {
          console.log('Fetching current user with valid token');
          const currentUser = await authService.getCurrentUser(token);
          console.log('Current user fetched:', currentUser);
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    getValidAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
