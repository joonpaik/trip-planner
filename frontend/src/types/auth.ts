export interface User {
  uid: string;
  // email: string;
  // name: string;
  username: string;
  // created_at: string;
  // updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  firstname: string;
  lastname: string;
  email: string;
}

export interface LoginResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  register: (
    email: string,
    password: string,
    firstname: string,
    lastname: string,
    username: string
  ) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  getValidAccessToken: () => Promise<string | null>;
}
