export interface FetchFilteredTasksRequest {
  uid: string;
  tripFilter: string | null;
  statusFilter: string | null;
  dueDateFilter: string | null;
  peopleFilter: string[];
  allTripMembers?: boolean;
}

export interface FetchFilteredTasksResponse {
  filteredTasks: FilteredTask[];
}

export interface TaskCostBreakdownEntry {
  uid: string;
  amount: number;
}

export interface FilteredTask {
  taskId: number;
  taskTitle: string;
  taskDescription: string;
  tripTitle: string;
  taskDeadline: Date;
  taskStatus: number;
  createdAt: string;
  updatedAt: string;
  totalCost?: number | null;
  costSplitType?: 'direct' | 'percentage' | null;
  assigneeUids?: string[];
  costBreakdown?: TaskCostBreakdownEntry[];
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

export interface TripDestination {
  notes: string;
  address: string;
  location: string;
}

export interface ItineraryItem {
  location: string;
  address: string;
  notes: string;
}

export interface CreateTripRequest {
  uid: string;
  name: string;
  destination: TripDestination;
  startDate: string;
  endDate: string;
  status: string;
  description: string;
  budget?: number | null;
  itineraryEnabled?: boolean;
  itinerary?: ItineraryItem[];
}

export interface CreateTripResponse {
  tripId: number;
  message: string;
}

export interface FetchUserTripsRequest {
  uid: string;
}

export interface TripSummary {
  id: number;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: string;
  description: string;
  budget: number | null;
  itineraryEnabled: boolean;
  itinerary: ItineraryItem[];
}

export interface FetchUserTripsResponse {
  trips: TripSummary[];
}

export interface DeleteTripRequest {
  uid: string;
  tripId: number;
}

export interface DeleteTripResponse {
  message: string;
}

export interface UpdateTripRequest {
  uid: string;
  tripId: number;
  name: string;
  destination: TripDestination;
  startDate: string;
  endDate: string;
  status: string;
  description: string;
  budget?: number | null;
  itineraryEnabled?: boolean;
  itinerary?: ItineraryItem[];
}

export interface UpdateTripResponse {
  tripId: number;
  message: string;
}

export interface CompleteTripRequest {
  uid: string;
  tripId: number;
}

export interface CompleteTripResponse {
  tripId: number;
  message: string;
}

export interface FetchTripMembersRequest {
  uid: string;
  tripId: number;
  search?: string;
}

export type TripMemberRole = 'admin' | 'participant';

export interface TripMember {
  uid: string;
  username: string;
  firstName: string;
  lastName: string;
  role: TripMemberRole;
}

export interface FetchTripMembersResponse {
  members: TripMember[];
}

export interface SetTripMemberRoleRequest {
  uid: string;
  tripId: number;
  memberUid: string;
  role: TripMemberRole;
}

export interface SetTripMemberRoleResponse {
  message: string;
}

export interface TaskAssigneeCost {
  uid: string;
  amount?: number | null;
  percentage?: number | null;
}

export interface CreateTaskRequest {
  uid: string;
  tripId: number;
  title: string;
  description: string;
  deadline: string;
  status: number;
  assigneeUids: string[];
  costEnabled?: boolean;
  totalCost?: number | null;
  costSplitType?: 'direct' | 'percentage' | null;
  assigneeCosts?: TaskAssigneeCost[];
}

export interface CreateTaskResponse {
  taskId: number;
  message: string;
}

export interface AddTripMemberRequest {
  uid: string;
  tripId: number;
  identifier: string;
}

export interface AddTripMemberResponse {
  message: string;
}

export interface RemoveTripMemberRequest {
  uid: string;
  tripId: number;
  memberUid: string;
}

export interface RemoveTripMemberResponse {
  message: string;
}

export interface FetchTripMemberProgressRequest {
  uid: string;
  tripId: number;
}

export interface TripMemberProgress {
  uid: string;
  username: string;
  totalTasks: number;
  completedTasks: number;
}

export interface FetchTripMemberProgressResponse {
  members: TripMemberProgress[];
}

export interface UpdateTaskRequest {
  uid: string;
  taskId: number;
  title: string;
  description: string;
  deadline: string;
  status: number;
  costEnabled?: boolean;
  totalCost?: number | null;
  costSplitType?: 'direct' | 'percentage' | null;
  assigneeCosts?: TaskAssigneeCost[];
}

export interface UpdateTaskResponse {
  taskId: number;
  message: string;
}

export interface UpdateTaskStatusRequest {
  uid: string;
  taskId: number;
  status: number;
}

export interface UpdateTaskStatusResponse {
  taskId: number;
  message: string;
}

export interface DeleteTaskRequest {
  uid: string;
  taskId: number;
}

export interface DeleteTaskResponse {
  message: string;
}

export interface FetchTaskAssigneeCostsRequest {
  uid: string;
  taskId: number;
}

export interface TaskAssigneeCostMember {
  uid: string;
  username: string;
  firstName: string;
  lastName: string;
  costAmount: number | null;
  costPercentage: number | null;
}

export interface FetchTaskAssigneeCostsResponse {
  totalCost: number | null;
  costSplitType: 'direct' | 'percentage' | null;
  assignees: TaskAssigneeCostMember[];
}
