// api.js — ArtVault Service Layer Base
// All backend communication goes through this module.
// Uses relative /api URLs — Vite proxy forwards to http://localhost:4000.

const API_BASE = '/api';

/** Retrieve the stored JWT token */
function getToken() {
  return localStorage.getItem('artvault_token');
}

/** Build headers, optionally adding Authorization and Content-Type */
function buildHeaders(isJson = true) {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (isJson) headers['Content-Type'] = 'application/json';
  return headers;
}

/** Parse an API response — throws on non-2xx */
async function handleResponse(res) {
  let body;
  try {
    body = await res.json();
  } catch {
    body = { error: `HTTP ${res.status}` };
  }
  if (!res.ok) {
    const msg = body?.error || body?.message || `HTTP ${res.status}`;
    // Auto-logout on 401 (token expired / invalid)
    if (res.status === 401) {
      localStorage.removeItem('artvault_token');
      localStorage.removeItem('artvault_user');
    }
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return body;
}

export const apiClient = {
  async get(endpoint, params) {
    const url = new URL(`${API_BASE}${endpoint}`, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
      });
    }
    const res = await fetch(url.toString(), {
      headers: buildHeaders(false),
    });
    return handleResponse(res);
  },

  async post(endpoint, data) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: buildHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async put(endpoint, data) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: buildHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async delete(endpoint) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers: buildHeaders(false),
    });
    return handleResponse(res);
  },

  /** POST multipart/form-data — for image uploads */
  async postForm(endpoint, formData) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: buildHeaders(false), // No Content-Type — let browser set boundary
      body: formData,
    });
    return handleResponse(res);
  },
};

export default apiClient;
