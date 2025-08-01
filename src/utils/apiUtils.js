// API Utility Functions for handling requests with authentication and error handling
import config from '@/config';

class ApiUtils {
  // Get authentication token
  static getAuthToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('userToken');
  }

  // Check if user is authenticated
  static isAuthenticated() {
    return !!this.getAuthToken();
  }

  // Handle API response errors
  static handleApiError(response, errorData = {}) {
    switch (response.status) {
      case 401:
        throw new Error('Authentication failed. Please sign in again.');
      case 403:
        throw new Error('Access denied. You do not have permission to perform this action.');
      case 404:
        throw new Error('Resource not found.');
      case 429:
        throw new Error('Too many requests. Please wait a moment and try again.');
      case 500:
        throw new Error('Server error. Please try again later.');
      default:
        throw new Error(errorData.message || `Request failed with status: ${response.status}`);
    }
  }

  // Make authenticated API request
  static async makeRequest(url, options = {}) {
    const token = this.getAuthToken();
    
    if (!token) {
      throw new Error('Authentication token not found. Please sign in again.');
    }

    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    const requestOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };

    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      this.handleApiError(response, errorData);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  }

  // GET request
  static async get(endpoint, params = {}) {
    const url = new URL(`${config.api.baseURL}${endpoint}`);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    return this.makeRequest(url.toString());
  }

  // POST request
  static async post(endpoint, data = {}) {
    return this.makeRequest(`${config.api.baseURL}${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // PUT request
  static async put(endpoint, data = {}) {
    return this.makeRequest(`${config.api.baseURL}${endpoint}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // DELETE request
  static async delete(endpoint) {
    return this.makeRequest(`${config.api.baseURL}${endpoint}`, {
      method: 'DELETE'
    });
  }

  // Customer Orders API methods
  static async getCustomerOrders(params = {}) {
    return this.get('/api/customer-orders', params);
  }

  static async getCustomerOrderById(orderId) {
    return this.get(`/api/customer-orders/${orderId}`);
  }

  static async getCustomerOrderStats() {
    return this.get('/api/customer-orders/stats');
  }

  static async createCustomerOrder(orderData) {
    return this.post('/api/customer-orders', orderData);
  }

  static async updateCustomerOrder(orderId, orderData) {
    return this.put(`/api/customer-orders/${orderId}`, orderData);
  }

  static async deleteCustomerOrder(orderId) {
    return this.delete(`/api/customer-orders/${orderId}`);
  }

  static async bulkCreateCustomerOrders(ordersData) {
    return this.post('/api/customer-orders/bulk', ordersData);
  }

  // User management API methods
  static async getUserRole() {
    return this.get('/api/user/role');
  }

  static async getUsers() {
    return this.get('/api/users');
  }

  static async createUser(userData) {
    return this.post('/api/users', userData);
  }

  static async updateUserRole(userId, role) {
    return this.put(`/api/users/${userId}/role`, { role });
  }
}

export default ApiUtils; 