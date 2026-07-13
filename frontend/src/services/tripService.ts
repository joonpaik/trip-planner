import {
  FetchFilteredTasksRequest,
  FetchFilteredTasksResponse,
  FilteredTask,
  FetchFilteredTasksCollaboratorRequest,
  FetchFilteredTasksCollaboratorResponse,
  TaskCollaborator,
  CreateTripRequest,
  CreateTripResponse,
  FetchUserTripsRequest,
  FetchUserTripsResponse,
  TripSummary,
  DeleteTripRequest,
  DeleteTripResponse,
  UpdateTripRequest,
  UpdateTripResponse,
  CompleteTripRequest,
  CompleteTripResponse,
  FetchTripMembersRequest,
  FetchTripMembersResponse,
  TripMember,
  CreateTaskRequest,
  CreateTaskResponse,
  AddTripMemberRequest,
  AddTripMemberResponse,
  RemoveTripMemberRequest,
  RemoveTripMemberResponse,
  FetchTripMemberProgressRequest,
  FetchTripMemberProgressResponse,
  TripMemberProgress,
  UpdateTaskRequest,
  UpdateTaskResponse,
  UpdateTaskStatusRequest,
  UpdateTaskStatusResponse,
  DeleteTaskRequest,
  DeleteTaskResponse,
  FetchTaskAssigneeCostsRequest,
  FetchTaskAssigneeCostsResponse,
  TaskAssigneeCostMember,
  SetTripMemberRoleRequest,
  SetTripMemberRoleResponse,
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
    CREATE_TRIP: '/trip/create',
    FETCH_USER_TRIPS: '/trip/fetch/user-trips',
    DELETE_TRIP: '/trip/delete',
    UPDATE_TRIP: '/trip/update',
    COMPLETE_TRIP: '/trip/complete',
    FETCH_TRIP_MEMBERS: '/trip/fetch/trip-members',
    CREATE_TASK: '/trip/task/create',
    ADD_TRIP_MEMBER: '/trip/add-member',
    REMOVE_TRIP_MEMBER: '/trip/remove-member',
    SET_TRIP_MEMBER_ROLE: '/trip/member/set-role',
    FETCH_MEMBER_PROGRESS: '/trip/fetch/member-progress',
    UPDATE_TASK: '/trip/task/update',
    UPDATE_TASK_STATUS: '/trip/task/update-status',
    DELETE_TASK: '/trip/task/delete',
    FETCH_TASK_ASSIGNEE_COSTS: '/trip/task/fetch-assignee-costs',
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
          all_trip_members: request.allTripMembers ?? false,
        }
      );

      // Extract filtered tasks from response
      const filteredTasks: FilteredTask[] = new Array<FilteredTask>();
      response.data.filtered_trips.forEach((item: any) => {
        const task: FilteredTask = {
          taskId: item.task_id,
          taskTitle: item.task_title,
          taskDescription: item.task_description,
          tripTitle: item.trip_title,
          taskDeadline: item.task_deadline,
          taskStatus: item.task_status,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          totalCost: item.total_cost ?? null,
          costSplitType: item.cost_split_type ?? null,
          assigneeUids: item.assignee_uids ?? [],
          costBreakdown: (item.cost_breakdown ?? []).map((c: any) => ({
            uid: c.uid,
            amount: c.amount,
          })),
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

  static async createTrip(
    request: CreateTripRequest
  ): Promise<CreateTripResponse> {
    try {
      const response = await apiService.post(
        API_BASE_URL + tripService.ENDPOINTS.CREATE_TRIP,
        {
          uid: request.uid,
          name: request.name,
          destination: {
            notes: request.destination.notes,
            address: request.destination.address,
            location: request.destination.location,
          },
          start_date: request.startDate,
          end_date: request.endDate,
          status: request.status,
          description: request.description,
          budget: request.budget ?? null,
          itinerary_enabled: request.itineraryEnabled ?? false,
          itinerary: (request.itinerary ?? []).map((item) => ({
            location: item.location,
            address: item.address,
            notes: item.notes,
          })),
        }
      );

      const formattedResponse: CreateTripResponse = {
        tripId: response.data.trip_id,
        message: response.data.message,
      };

      return formattedResponse;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  static async fetchUserTrips(
    request: FetchUserTripsRequest
  ): Promise<FetchUserTripsResponse> {
    try {
      const response = await apiService.post(
        API_BASE_URL + tripService.ENDPOINTS.FETCH_USER_TRIPS,
        {
          uid: request.uid,
        }
      );

      const trips: TripSummary[] = response.data.trips.map((item: any) => ({
        id: item.id,
        name: item.name,
        destination: item.destination,
        startDate: item.start_date,
        endDate: item.end_date,
        status: item.status,
        description: item.description,
        budget: item.budget ?? null,
        itineraryEnabled: item.itinerary_enabled ?? false,
        itinerary: (item.itinerary ?? []).map((entry: any) => ({
          location: entry.location,
          address: entry.address,
          notes: entry.notes,
        })),
      }));

      return { trips };
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  static async deleteTrip(
    request: DeleteTripRequest
  ): Promise<DeleteTripResponse> {
    try {
      const response = await apiService.post(
        API_BASE_URL + tripService.ENDPOINTS.DELETE_TRIP,
        {
          uid: request.uid,
          trip_id: request.tripId,
        }
      );

      return { message: response.data.message };
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  static async updateTrip(
    request: UpdateTripRequest
  ): Promise<UpdateTripResponse> {
    try {
      const response = await apiService.post(
        API_BASE_URL + tripService.ENDPOINTS.UPDATE_TRIP,
        {
          uid: request.uid,
          trip_id: request.tripId,
          name: request.name,
          destination: {
            notes: request.destination.notes,
            address: request.destination.address,
            location: request.destination.location,
          },
          start_date: request.startDate,
          end_date: request.endDate,
          status: request.status,
          description: request.description,
          budget: request.budget ?? null,
          itinerary_enabled: request.itineraryEnabled ?? false,
          itinerary: (request.itinerary ?? []).map((item) => ({
            location: item.location,
            address: item.address,
            notes: item.notes,
          })),
        }
      );

      return {
        tripId: response.data.trip_id,
        message: response.data.message,
      };
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  static async completeTrip(
    request: CompleteTripRequest
  ): Promise<CompleteTripResponse> {
    try {
      const response = await apiService.post(
        API_BASE_URL + tripService.ENDPOINTS.COMPLETE_TRIP,
        {
          uid: request.uid,
          trip_id: request.tripId,
        }
      );

      return {
        tripId: response.data.trip_id,
        message: response.data.message,
      };
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  static async fetchTripMembers(
    request: FetchTripMembersRequest
  ): Promise<FetchTripMembersResponse> {
    try {
      const response = await apiService.post(
        API_BASE_URL + tripService.ENDPOINTS.FETCH_TRIP_MEMBERS,
        {
          uid: request.uid,
          trip_id: request.tripId,
          search: request.search ?? '',
        }
      );

      const members: TripMember[] = response.data.members.map(
        (item: any) => ({
          uid: item.uid,
          username: item.username,
          firstName: item.first_name,
          lastName: item.last_name,
          role: item.role ?? 'participant',
        })
      );

      return { members };
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  static async setTripMemberRole(
    request: SetTripMemberRoleRequest
  ): Promise<SetTripMemberRoleResponse> {
    try {
      const response = await apiService.post(
        API_BASE_URL + tripService.ENDPOINTS.SET_TRIP_MEMBER_ROLE,
        {
          uid: request.uid,
          trip_id: request.tripId,
          member_uid: request.memberUid,
          role: request.role,
        }
      );

      return { message: response.data.message };
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  static async createTask(
    request: CreateTaskRequest
  ): Promise<CreateTaskResponse> {
    try {
      const response = await apiService.post(
        API_BASE_URL + tripService.ENDPOINTS.CREATE_TASK,
        {
          uid: request.uid,
          trip_id: request.tripId,
          title: request.title,
          description: request.description,
          deadline: request.deadline,
          status: request.status,
          assignee_uids: request.assigneeUids,
          cost_enabled: request.costEnabled ?? false,
          total_cost: request.totalCost ?? null,
          cost_split_type: request.costSplitType ?? null,
          assignee_costs: (request.assigneeCosts ?? []).map((c) => ({
            uid: c.uid,
            amount: c.amount ?? null,
            percentage: c.percentage ?? null,
          })),
        }
      );

      return {
        taskId: response.data.task_id,
        message: response.data.message,
      };
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  static async addTripMember(
    request: AddTripMemberRequest
  ): Promise<AddTripMemberResponse> {
    try {
      const response = await apiService.post(
        API_BASE_URL + tripService.ENDPOINTS.ADD_TRIP_MEMBER,
        {
          uid: request.uid,
          trip_id: request.tripId,
          identifier: request.identifier,
        }
      );

      return { message: response.data.message };
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  static async removeTripMember(
    request: RemoveTripMemberRequest
  ): Promise<RemoveTripMemberResponse> {
    try {
      const response = await apiService.post(
        API_BASE_URL + tripService.ENDPOINTS.REMOVE_TRIP_MEMBER,
        {
          uid: request.uid,
          trip_id: request.tripId,
          member_uid: request.memberUid,
        }
      );

      return { message: response.data.message };
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  static async fetchTripMemberProgress(
    request: FetchTripMemberProgressRequest
  ): Promise<FetchTripMemberProgressResponse> {
    try {
      const response = await apiService.post(
        API_BASE_URL + tripService.ENDPOINTS.FETCH_MEMBER_PROGRESS,
        {
          uid: request.uid,
          trip_id: request.tripId,
        }
      );

      const members: TripMemberProgress[] = response.data.members.map(
        (item: any) => ({
          uid: item.uid,
          username: item.username,
          totalTasks: item.total_tasks,
          completedTasks: item.completed_tasks,
        })
      );

      return { members };
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  static async updateTask(
    request: UpdateTaskRequest
  ): Promise<UpdateTaskResponse> {
    try {
      const response = await apiService.post(
        API_BASE_URL + tripService.ENDPOINTS.UPDATE_TASK,
        {
          uid: request.uid,
          task_id: request.taskId,
          title: request.title,
          description: request.description,
          deadline: request.deadline,
          status: request.status,
          cost_enabled: request.costEnabled ?? false,
          total_cost: request.totalCost ?? null,
          cost_split_type: request.costSplitType ?? null,
          assignee_costs: (request.assigneeCosts ?? []).map((c) => ({
            uid: c.uid,
            amount: c.amount ?? null,
            percentage: c.percentage ?? null,
          })),
        }
      );

      return {
        taskId: response.data.task_id,
        message: response.data.message,
      };
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  static async updateTaskStatus(
    request: UpdateTaskStatusRequest
  ): Promise<UpdateTaskStatusResponse> {
    try {
      const response = await apiService.post(
        API_BASE_URL + tripService.ENDPOINTS.UPDATE_TASK_STATUS,
        {
          uid: request.uid,
          task_id: request.taskId,
          status: request.status,
        }
      );

      return {
        taskId: response.data.task_id,
        message: response.data.message,
      };
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  static async deleteTask(
    request: DeleteTaskRequest
  ): Promise<DeleteTaskResponse> {
    try {
      const response = await apiService.post(
        API_BASE_URL + tripService.ENDPOINTS.DELETE_TASK,
        {
          uid: request.uid,
          task_id: request.taskId,
        }
      );

      return { message: response.data.message };
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  static async fetchTaskAssigneeCosts(
    request: FetchTaskAssigneeCostsRequest
  ): Promise<FetchTaskAssigneeCostsResponse> {
    try {
      const response = await apiService.post(
        API_BASE_URL + tripService.ENDPOINTS.FETCH_TASK_ASSIGNEE_COSTS,
        {
          uid: request.uid,
          task_id: request.taskId,
        }
      );

      const assignees: TaskAssigneeCostMember[] = response.data.assignees.map(
        (item: any) => ({
          uid: item.uid,
          username: item.username,
          firstName: item.first_name,
          lastName: item.last_name,
          costAmount: item.cost_amount ?? null,
          costPercentage: item.cost_percentage ?? null,
        })
      );

      return {
        totalCost: response.data.total_cost ?? null,
        costSplitType: response.data.cost_split_type ?? null,
        assignees,
      };
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
