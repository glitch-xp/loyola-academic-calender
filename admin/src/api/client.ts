const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

class ApiClient {
  private getHeaders() {
    const token = localStorage.getItem('admin_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_username');
        window.location.href = '/login';
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP Error: ${response.status}`);
    }

    // Some endpoints might return empty response (like DELETE)
    const text = await response.text();
    return text ? JSON.parse(text) : {} as T;
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, body: any) {
    return this.request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) });
  }

  put<T>(endpoint: string, body: any) {
    return this.request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
