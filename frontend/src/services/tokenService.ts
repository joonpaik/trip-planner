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
      console.log(
        'tokenService: Getting access token:' +
          localStorage.getItem(TokenService.TOKEN_KEY.ACCESS_TOKEN)
      );
      console.log(
        'tokenService: Getting access token:' + localStorage.getItem('dummy')
      );
      return localStorage.getItem(TokenService.TOKEN_KEY.ACCESS_TOKEN);
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  getRefreshToken(): string | null {
    try {
      console.log(
        'tokenService: Getting refresh token:' +
          localStorage.getItem(TokenService.TOKEN_KEY.REFRESH_TOKEN)
      );
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
      localStorage.setItem('dummy', 'just to trigger storage event');

      console.log(
        'tokenService: Set refresh token:' +
          localStorage.getItem(TokenService.TOKEN_KEY.REFRESH_TOKEN),
        'access token:' +
          localStorage.getItem(TokenService.TOKEN_KEY.ACCESS_TOKEN)
      );
    } catch (error) {
      console.error('Error setting tokens:', error);
    }
  }

  clearTokens(): void {
    try {
      console.log('Clearing tokens');
      localStorage.removeItem(TokenService.TOKEN_KEY.ACCESS_TOKEN);
      localStorage.removeItem(TokenService.TOKEN_KEY.REFRESH_TOKEN);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  isTokenExpired(token: string): boolean {
    try {
      if (!token) return true;

      const parts = token.split('.');
      if (parts.length !== 3) return true;

      let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (payload.length % 4) {
        payload += '=';
      }

      const decoded = JSON.parse(atob(payload)) as JWTPayload;
      console.log('Decoded token payload:', decoded);
      return decoded.exp * 1000 < Date.now();
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }
}

export const tokenService = new TokenService();
