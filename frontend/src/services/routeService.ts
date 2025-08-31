const API_BASE_URL = 'http://localhost:8000';

class RouteService {
  private async request<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${endpoint}`);
    }
    const data = await response.json();
    return data;
  }

  async getUserTasks() {
    const res = this.request('/user_tasks/fetch');

    return res;
  }
}

export const routeService = new RouteService();
