import { AddFriendRequest, AddFriendResponse } from '../types/user';
import { apiService } from './apiService';
import { API_BASE_URL } from '../utils/constants';

export class userService {
  private static readonly ENDPOINTS = {
    ADD_FRIEND: '/user/add-friend',
  } as const;

  static async addFriend(request: AddFriendRequest): Promise<AddFriendResponse> {
    try {
      const response = await apiService.post(
        API_BASE_URL + userService.ENDPOINTS.ADD_FRIEND,
        {
          uid: request.uid,
          identifier: request.identifier,
        }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private static handleError(error: any, defaultMessage = 'Request failed'): Error {
    if (error.response?.data?.detail) {
      return new Error(error.response.data.detail);
    }
    if (error.message) {
      return new Error(error.message);
    }
    return new Error(defaultMessage);
  }
}
