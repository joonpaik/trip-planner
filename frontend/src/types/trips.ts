export interface FetchFilteredTasksRequest {
  uid: string;
  tripFilter: string | null;
  statusFilter: string | null;
  dueDateFilter: string | null;
  peopleFilter: string[];
}

export interface FetchFilteredTasksResponse {
  filteredTasks: FilteredTask[];
}

export interface FilteredTask {
  taskTitle: string;
  taskDescription: string;
  tripTitle: string;
  taskDeadline: Date;
  taskStatus: number;
  createdAt: string;
  updatedAt: string;
}
