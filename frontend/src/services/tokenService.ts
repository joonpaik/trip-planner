export interface JWTPayload {
  sub: string;
  exp: number;
  iat: number;
  type: 'access' | 'refresh';
  user_id: string;
}

export interface TokenStorage {
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  setTokens(accessToken: string, refreshToken: string): void;
  clearTokens(): void;
  isTokenExpired(token: string): boolean;
}

class TokenService implements TokenStorage {
  private static readonly TOKEN_KEY = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
  } as const;

  getAccessToken(): string | null {
    try {
      return localStorage.getItem(TokenService.TOKEN_KEY.ACCESS_TOKEN);
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  getRefreshToken(): string | null {
    try {
      return localStorage.getItem(TokenService.TOKEN_KEY.REFRESH_TOKEN);
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  setTokens(accessToken: string, refreshToken: string): void {
    try {
      localStorage.setItem(TokenService.TOKEN_KEY.ACCESS_TOKEN, accessToken);
      localStorage.setItem(TokenService.TOKEN_KEY.REFRESH_TOKEN, refreshToken);
    } catch (error) {
      console.error('Error setting tokens:', error);
    }
  }

  clearTokens(): void {
    try {
      localStorage.removeItem(TokenService.TOKEN_KEY.ACCESS_TOKEN);
      localStorage.removeItem(TokenService.TOKEN_KEY.REFRESH_TOKEN);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as JWTPayload;
      return payload.exp * 1000 < Date.now();
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }
}

export const tokenService = new TokenService();
