// User Types
export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface UserCreate {
  email: string;
  username: string;
  password: string;
  full_name: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user?: User;
}

// Post Types
export interface Post {
  id: number;
  user_id: number;
  content: string;
  image_url?: string;
  likes_count: number;
  created_at: string;
  author: User;
  comments?: Comment[];
}

export interface PostCreate {
  content: string;
  image?: File;
}

// Redux State Types
export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface PostsState {
  posts: Post[];
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
}

// Component Props Types
export interface PostCardProps {
  post: Post;
  onLike: (postId: number) => void;
  onComment: (postId: number) => void;
}

export interface CreatePostProps {
  user: User;
  onPostCreated?: (post: Post) => void;
}

export interface PrivateRouteProps {
  children: React.ReactNode;
}

// Form Types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  full_name: string;
}
