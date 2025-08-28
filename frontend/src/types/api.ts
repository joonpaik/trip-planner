export interface ApiError {
  detail: string;
  code?: string;
  field?: string;
}

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  status: number;
}
