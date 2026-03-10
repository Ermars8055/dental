const API_URL = import.meta.env.VITE_API_URL || '/api';
const AUTH_TOKEN_KEY = import.meta.env.VITE_AUTH_TOKEN_KEY || 'authToken';
const CSRF_TOKEN_KEY = 'csrfToken';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  statusCode: number;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class ApiClient {
  private baseURL: string;
  private tokenKey: string;
  private csrfTokenKey: string;

  constructor(baseURL: string = API_URL, tokenKey: string = AUTH_TOKEN_KEY) {
    this.baseURL = baseURL;
    this.tokenKey = tokenKey;
    this.csrfTokenKey = CSRF_TOKEN_KEY;
  }

  /**
   * Get stored authentication token
   */
  private getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Set authentication token
   */
  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  /**
   * Clear authentication token
   */
  clearToken(): void {
    localStorage.removeItem(this.tokenKey);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Get stored CSRF token
   */
  private getCsrfToken(): string | null {
    return localStorage.getItem(this.csrfTokenKey);
  }

  /**
   * Set CSRF token
   */
  private setCsrfToken(token: string): void {
    localStorage.setItem(this.csrfTokenKey, token);
  }

  /**
   * Fetch CSRF token from server
   */
  async fetchCsrfToken(): Promise<string> {
    try {
      const token = localStorage.getItem(this.tokenKey);
      const response = await fetch(`${this.baseURL}/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status} ${response.statusText}`);
      }

      const csrfToken = response.headers.get('X-CSRF-Token');
      if (csrfToken) {
        this.setCsrfToken(csrfToken);
        return csrfToken;
      }

      throw new Error('No CSRF token in response');
    } catch (error) {
      console.warn('Failed to fetch CSRF token:', error);
      return '';
    }
  }

  /**
   * Build headers with authentication and CSRF token
   */
  private getHeaders(additionalHeaders: Record<string, string> = {}, method: string = 'GET', endpoint: string = ''): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...additionalHeaders,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Add CSRF token for state-changing requests (except public auth endpoints)
    const publicAuthEndpoints = ['/auth/login', '/auth/register', '/auth/refresh'];
    const isPublicAuthEndpoint = publicAuthEndpoints.some(path => endpoint.includes(path));

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !isPublicAuthEndpoint) {
      const csrfToken = this.getCsrfToken();
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }
    }

    return headers;
  }

  /**
   * Handle API errors
   */
  private async handleError(response: Response): Promise<never> {
    // If 401 Unauthorized, clear token and redirect to login
    if (response.status === 401) {
      this.clearToken();
      window.location.href = '/login';
      throw new Error('Unauthorized - please login again');
    }

    // Try to extract error message from response
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData?.message || errorMessage;
      }
    } catch (e) {
      // Could not parse error response, use default message
    }

    throw new Error(errorMessage);
  }

  /**
   * Make HTTP request
   */
  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const method = (options.method || 'GET').toUpperCase();

    try {
      const response = await fetch(url, {
        ...options,
        headers: this.getHeaders(options.headers as Record<string, string>, method, endpoint),
      });

      if (!response.ok) {
        // Extract CSRF token from response headers if available
        const csrfToken = response.headers.get('X-CSRF-Token');
        if (csrfToken) {
          this.setCsrfToken(csrfToken);
        }

        await this.handleError(response);
      }

      // Extract and store CSRF token from successful responses
      const csrfToken = response.headers.get('X-CSRF-Token');
      if (csrfToken) {
        this.setCsrfToken(csrfToken);
      }

      // Safely parse JSON response
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error(`Expected JSON response, got ${contentType || 'unknown content type'}`);
      }

      let data: ApiResponse<T>;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        throw new Error('Invalid JSON response from server');
      }

      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response structure from server');
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    body?: any,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(
    endpoint: string,
    body?: any,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    endpoint: string,
    body?: any,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export class for testing or multiple instances
export default ApiClient;
