import {
  FetchFilteredTasksRequest,
  FetchFilteredTasksResponse,
  FilteredTask,
  FetchFilteredTasksCollaboratorRequest,
  FetchFilteredTasksCollaboratorResponse,
  TaskCollaborator,
} from '../types/trips';
import { apiService } from './apiService';
import { API_BASE_URL } from '../utils/constants';
import axios from 'axios';
import { access } from 'fs';

export class tripService {
  private static readonly ENDPOINTS = {
    FETCH_FILTERED_TASKS: '/trip/fetch/filtered-tasks',
    FETCH_FILTERED_TASK_COLLABORATORS:
      '/trip/fetch/filtered-task-collaborators',
  } as const;

  static async fetchFilteredTasks(
    request: FetchFilteredTasksRequest
  ): Promise<FetchFilteredTasksResponse> {
    try {
      const response = await apiService.post(
        API_BASE_URL + tripService.ENDPOINTS.FETCH_FILTERED_TASKS,
        {
          uid: request.uid,
          trip_filter: request.tripFilter ? request.tripFilter : '',
          status_filter: request.statusFilter ? request.statusFilter : '',
          due_date_filter: request.dueDateFilter ? request.dueDateFilter : '',
          people_filter: request.peopleFilter ? request.peopleFilter : [],
        }
      );

      // Extract filtered tasks from response
      const filteredTasks: FilteredTask[] = new Array<FilteredTask>();
      response.data.filtered_trips.forEach((item: any) => {
        const task: FilteredTask = {
          taskTitle: item.task_title,
          taskDescription: item.task_description,
          tripTitle: item.trip_title,
          taskDeadline: item.task_deadline,
          taskStatus: item.task_status,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        };
        filteredTasks.push(task);
      });

      // Map the response to match the FetchFilteredTasksResponse interface
      const formattedResponse: FetchFilteredTasksResponse = {
        filteredTasks: filteredTasks,
      };

      console.log('Fetch Filtered Request response:', formattedResponse);

      return formattedResponse;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  static async fetchFilteredTaskCollaborators(
    request: FetchFilteredTasksCollaboratorRequest
  ): Promise<FetchFilteredTasksCollaboratorResponse> {
    try {
      const response = await apiService.post(
        API_BASE_URL + tripService.ENDPOINTS.FETCH_FILTERED_TASK_COLLABORATORS,
        {
          uid: request.uid,
        }
      );

      // Extract collaborators from response
      const collaborators: TaskCollaborator[] = new Array<TaskCollaborator>();
      response.data.collaborators.forEach((item: any) => {
        const collaborator: TaskCollaborator = {
          uid: item.uid,
          email: item.email,
          username: item.username,
          first_name: item.first_name,
          last_name: item.last_name,
        };
        collaborators.push(collaborator);
      });

      // Map the response to match the FetchFilteredTasksCollaboratorResponse interface
      const formattedResponse: FetchFilteredTasksCollaboratorResponse = {
        collaborators: collaborators,
      };

      return formattedResponse;
    } catch (error) {
      throw this.handleAuthError(error);
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
