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

export interface FetchFilteredTasksCollaboratorRequest {
  uid: string;
}

export interface FetchFilteredTasksCollaboratorResponse {
  collaborators: TaskCollaborator[];
}
export interface TaskCollaborator {
  uid: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
}
