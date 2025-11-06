/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * API Client for Frontend-Backend Communication
 * Handles all HTTP requests to the backend API
 */

interface ApiRequestOptions extends RequestInit {
  skipAuth?: boolean;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  errors?: any[];
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }

  private async request<T = any>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const { skipAuth, ...fetchOptions } = options;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    const config: RequestInit = {
      ...fetchOptions,
      headers,
      credentials: 'include', // Important for cookies
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);
      
      // Handle non-JSON responses (like redirect responses)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return {} as T;
      }

      const data: ApiResponse<T> = await response.json();

      if (!response.ok) {
        // Handle validation errors with detailed messages
        if (data.errors && Array.isArray(data.errors)) {
          const errorMessages = data.errors.map((err: any) => 
            err.message || `${err.path?.join('.')}: ${err.code}`
          ).join(', ');
          throw new Error(`${data.error || 'Validation failed'}: ${errorMessages}`);
        }
        // For 401 errors, include the status code in the error message
        const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
        throw new Error(errorMsg);
      }

      return data.data as T;
    } catch (error) {
      // Only log errors that aren't expected auth failures
      // 401 errors on auth endpoints are normal when checking auth status
      const isExpectedAuthError = endpoint.includes('/auth/me') && 
        error instanceof Error && 
        (error.message.includes('Not authenticated') || 
         error.message.includes('401') ||
         error.message.includes('Authentication required'));
      
      if (!isExpectedAuthError) {
        console.error('API Request Error:', error);
      }
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  }

  // GET request
  async get<T = any>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  // POST request
  async post<T = any>(
    endpoint: string,
    data?: any,
    options?: ApiRequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT request
  async put<T = any>(
    endpoint: string,
    data?: any,
    options?: ApiRequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // PATCH request
  async patch<T = any>(
    endpoint: string,
    data?: any,
    options?: ApiRequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete<T = any>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export typed API methods for common endpoints
export const api = {
  // Auth endpoints
  auth: {
    login: (email: string, password: string) =>
      apiClient.post('/api/auth/login', { email, password }),
    
    register: (name: string, email: string, password: string, role: string) =>
      apiClient.post('/api/auth/register', { name, email, password, role }),
    
    logout: () =>
      apiClient.post('/api/auth/logout'),
    
    me: () =>
      apiClient.get('/api/auth/me'),
  },

  // Exam endpoints
  exams: {
    list: () =>
      apiClient.get('/api/exams'),
    
    get: (id: string) =>
      apiClient.get(`/api/exams/${id}`),
    
    create: (data: any) =>
      apiClient.post('/api/exams', data),
    
    update: (id: string, data: any) =>
      apiClient.patch(`/api/exams/${id}`, data),
    
    delete: (id: string) =>
      apiClient.delete(`/api/exams/${id}`),
    
    publish: (id: string) =>
      apiClient.post(`/api/exams/${id}/publish`),
    
    enroll: (id: string, studentIds: string[]) =>
      apiClient.post(`/api/exams/${id}/enroll`, { studentIds }),
    
    sessions: (id: string) =>
      apiClient.get(`/api/exams/${id}/sessions`),
    
    submissions: (id: string) =>
      apiClient.get(`/api/exams/${id}/submissions`),
    
    submission: {
      get: (id: string) =>
        apiClient.get(`/api/submissions/${id}`),
      
      grade: (id: string, data: { grades?: Array<{ questionId: string; pointsAwarded: number }>; feedback?: string; totalScore?: number }) =>
        apiClient.patch(`/api/submissions/${id}`, data),
    },
  },

  // Question endpoints
  questions: {
    list: () =>
      apiClient.get('/api/questions'),
    
    get: (id: string) =>
      apiClient.get(`/api/questions/${id}`),
    
    create: (data: any) =>
      apiClient.post('/api/questions', data),
    
    update: (id: string, data: any) =>
      apiClient.put(`/api/questions/${id}`, data),
    
    delete: (id: string) =>
      apiClient.delete(`/api/questions/${id}`),
  },

  // Monitoring endpoints
  monitor: {
    events: (examId: string, studentId?: string) =>
      apiClient.get(`/api/monitor/events?examId=${examId}${studentId ? `&studentId=${studentId}` : ''}`),
    
    sendEvent: (data: any) =>
      apiClient.post('/api/monitor/events', data),
  },

  student: {
    dashboard: () =>
      apiClient.get('/api/student/dashboard'),
  },

  // Media endpoints
  media: {
    uploadSnapshot: (formData: FormData) =>
      apiClient.post('/api/media/snapshots', formData),
    
    getSnapshot: (id: string) =>
      apiClient.get(`/api/media/snapshots/${id}`),
  },

  // Health check
  health: () =>
    apiClient.get('/api/health'),
};

export default api;
