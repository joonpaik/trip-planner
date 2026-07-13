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

// Tokens live in sessionStorage (not localStorage) so each browser tab/window
// keeps its own independent session - signing into a different account in
// another tab won't overwrite this one's session, matching how most apps
// let you use multiple accounts side by side in separate windows.
class TokenService implements TokenStorage {
  private static readonly TOKEN_KEY = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
  } as const;

  getAccessToken(): string | null {
    try {
      return sessionStorage.getItem(TokenService.TOKEN_KEY.ACCESS_TOKEN);
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  getRefreshToken(): string | null {
    try {
      return sessionStorage.getItem(TokenService.TOKEN_KEY.REFRESH_TOKEN);
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  setTokens(accessToken: string, refreshToken: string): void {
    try {
      sessionStorage.setItem(TokenService.TOKEN_KEY.ACCESS_TOKEN, accessToken);
      sessionStorage.setItem(TokenService.TOKEN_KEY.REFRESH_TOKEN, refreshToken);
    } catch (error) {
      console.error('Error setting tokens:', error);
    }
  }

  clearTokens(): void {
    try {
      sessionStorage.removeItem(TokenService.TOKEN_KEY.ACCESS_TOKEN);
      sessionStorage.removeItem(TokenService.TOKEN_KEY.REFRESH_TOKEN);
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
      return decoded.exp * 1000 < Date.now();
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }
}

export const tokenService = new TokenService();
