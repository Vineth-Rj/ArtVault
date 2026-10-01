// auth.js — ArtVault Auth Service
// Connects to POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
import apiClient from './api';

export const authService = {
  /**
   * Login with email + password.
   * Backend: POST /api/auth/login → { user, token }
   */
  async login(email, password) {
    try {
      const data = await apiClient.post('/auth/login', { email, password });
      localStorage.setItem('artvault_token', data.token);
      localStorage.setItem('artvault_user', JSON.stringify(data.user));
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err.message };
    }
  },

  /**
   * Register a new account.
   * Backend: POST /api/auth/register → { user, token }
   * role: 'COLLECTOR' | 'ARTIST'  (backend enum — uppercase)
   */
  async register(name, email, password, role = 'COLLECTOR') {
    try {
      const data = await apiClient.post('/auth/register', {
        name,
        email,
        password,
        role: role.toUpperCase(),
      });
      localStorage.setItem('artvault_token', data.token);
      localStorage.setItem('artvault_user', JSON.stringify(data.user));
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err.message };
    }
  },

  /**
   * Refresh the current user from the server.
   * Backend: GET /api/auth/me → { user }
   * Falls back to localStorage if no token.
   */
  async getCurrentUser() {
    const token = localStorage.getItem('artvault_token');
    if (!token) return { data: null, error: null };

    try {
      const data = await apiClient.get('/auth/me');
      // Keep localStorage in sync
      localStorage.setItem('artvault_user', JSON.stringify(data.user));
      return { data: data.user, error: null };
    } catch (err) {
      if (err.status === 401) {
        // Token expired — clear storage
        localStorage.removeItem('artvault_token');
        localStorage.removeItem('artvault_user');
        return { data: null, error: null };
      }
      // Network error — fall back to cached user
      const stored = localStorage.getItem('artvault_user');
      if (stored) return { data: JSON.parse(stored), error: null };
      return { data: null, error: err.message };
    }
  },

  logout() {
    localStorage.removeItem('artvault_token');
    localStorage.removeItem('artvault_user');
  },

  isAuthenticated() {
    return !!localStorage.getItem('artvault_token');
  },

  /** Get cached user without hitting the server */
  getCachedUser() {
    const stored = localStorage.getItem('artvault_user');
    return stored ? JSON.parse(stored) : null;
  },
};

export default authService;
