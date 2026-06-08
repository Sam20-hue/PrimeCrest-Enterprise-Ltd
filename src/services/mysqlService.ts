/**
 * MySQL API Service
 * -----------------------------------------------------------------------------
 * Since this is a browser-based React app, direct MySQL connections are NOT
 * possible from the frontend (security + browser limitations). This service
 * connects to a REST API backend that wraps your MySQL database.
 *
 * SETUP INSTRUCTIONS:
 * 1. Deploy a simple REST API server (Node.js/Express, PHP, Python/Flask, etc.)
 *    that connects to your MySQL database.
 * 2. Set the API base URL in the Admin Panel ? Settings ? MySQL API URL field.
 * 3. Your API should expose endpoints like:
 *    GET    /api/services         ? list services
 *    POST   /api/services         ? create service
 *    PUT    /api/services/:id     ? update service
 *    DELETE /api/services/:id     ? delete service
 *    (Same pattern for gallery, blog, products, settings, testimonials)
 *
 * EXAMPLE Node.js/Express + MySQL backend snippet:
 * ----------------------------------------------
 * const express = require('express');
 * const mysql = require('mysql2/promise');
 * const cors = require('cors');
 * const app = express();
 * app.use(cors());
 * app.use(express.json());
 *
 * const pool = mysql.createPool({
 *   host: 'localhost',
 *   user: 'your_user',
 *   password: 'your_password',
 *   database: 'primecrest_db',
 * });
 *
 * app.get('/api/services', async (req, res) => {
 *   const [rows] = await pool.query('SELECT * FROM services');
 *   res.json(rows);
 * });
 * // ... repeat for other tables
 * app.listen(3001);
 */

import type { Contact } from '../context/SiteDataContext';

const getDefaultApiUrl = (): string => {
  if (typeof window === 'undefined') return 'http://localhost:3002';
  return '/api';
};

const normalizeBaseApiUrl = (url: string | undefined): string => {
  if (!url) return '';
  const trimmed = url.trim().replace(/\/+$/, '');
  const apiIndex = trimmed.toLowerCase().indexOf('/api');
  return apiIndex === -1 ? trimmed : trimmed.substring(0, apiIndex);
};

const normalizeApiUrl = (url: string | undefined): string => {
  const cleaned = normalizeBaseApiUrl(url);
  if (!cleaned) return getDefaultApiUrl();
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  if (/^\/\//.test(cleaned)) return `${window.location.protocol}${cleaned}`;
  if (/^:\d+$/.test(cleaned)) return `${window.location.protocol}//${window.location.hostname}${cleaned}`;
  return `${window.location.protocol}//${cleaned}`;
};

const getApiUrl = (): string => {
  const preferred = getDefaultApiUrl();
  try {
    const stored = localStorage.getItem('pc_settings');
    if (stored) {
      const settings = JSON.parse(stored);
      const normalized = normalizeApiUrl(settings.mysqlApiUrl);
      const currentHostname = window.location.hostname || 'localhost';
      const isCurrentLocal = currentHostname === 'localhost' || currentHostname === '127.0.0.1';
      const isLocalUrl = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(normalized || '');

      if (!isCurrentLocal && isLocalUrl) {
        console.warn('[mysqlService] Ignoring local API URL on non-local host:', normalized);
        return preferred;
      }

      return normalized || preferred;
    }
  } catch {
    // ignore parse errors
  }
  return preferred;
};

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  ok: boolean;
}

interface TotpSetupResponse {
  qrCode: string;
  otpauthUrl?: string;
  secret: string;
}

interface TotpStatusResponse {
  setup?: boolean;
  enabled?: boolean;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  const baseUrl = getApiUrl() || '/api';
  const requestUrl = baseUrl.endsWith('/api')
    ? baseUrl.replace(/\/api$/, '') + path
    : baseUrl + path;
  try {
    console.debug('[mysqlService]', method, requestUrl);
    const res = await fetch(requestUrl, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      mode: 'cors',
    });
    if (!res.ok) {
      const text = await res.text();
      return { data: null, error: `API Error ${res.status}: ${text}`, ok: false };
    }
    const data = await res.json();
    return { data, error: null, ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    const errMsg = `Network error contacting ${baseUrl}${path}: ${msg}`;
    console.error('[mysqlService] request failed:', method, `${baseUrl}${path}`, msg);
    return { data: null, error: errMsg, ok: false };
  }
}

export const mysqlService = {
  // -- Services --------------------------------------------------------------
  getServices: () => request('GET', '/api/services'),
  createService: (data: unknown) => request('POST', '/api/services', data),
  updateService: (id: string, data: unknown) => request('PUT', `/api/services/${id}`, data),
  deleteService: (id: string) => request('DELETE', `/api/services/${id}`),

  // -- Gallery ---------------------------------------------------------------
  getGallery: () => request('GET', '/api/gallery'),
  createGalleryItem: (data: unknown) => request('POST', '/api/gallery', data),
  updateGalleryItem: (id: string, data: unknown) => request('PUT', `/api/gallery/${id}`, data),
  deleteGalleryItem: (id: string) => request('DELETE', `/api/gallery/${id}`),

  // -- Blog Posts ------------------------------------------------------------
  getBlogPosts: () => request('GET', '/api/blog'),
  createBlogPost: (data: unknown) => request('POST', '/api/blog', data),
  updateBlogPost: (id: string, data: unknown) => request('PUT', `/api/blog/${id}`, data),
  deleteBlogPost: (id: string) => request('DELETE', `/api/blog/${id}`),

  // -- Subscribers --------------------------------------------------------
  getSubscribers: () => request<string[]>('GET', '/api/subscribers'),
  subscribeEmail: (data: unknown) => request('POST', '/api/subscribers', data),
  deleteSubscriber: (email: string) => request('DELETE', `/api/subscribers?email=${encodeURIComponent(email)}`),

  // -- Team --------------------------------------------------------------
  getTeam: () => request('GET', '/api/team'),

  // -- Products --------------------------------------------------------------
  getProducts: () => request('GET', '/api/products'),
  createProduct: (data: unknown) => request('POST', '/api/products', data),
  updateProduct: (id: string, data: unknown) => request('PUT', `/api/products/${id}`, data),
  deleteProduct: (id: string) => request('DELETE', `/api/products/${id}`),

  // -- Settings -----------------------------------------------------------------
  getSettings: () => request('GET', '/api/settings'),
  updateSettings: (data: unknown) => request('PUT', '/api/settings', data),

  // -- Testimonials ----------------------------------------------------------
  getTestimonials: () => request('GET', '/api/testimonials'),
  createTestimonial: (data: unknown) => request('POST', '/api/testimonials', data),
  updateTestimonial: (id: string, data: unknown) => request('PUT', `/api/testimonials/${id}`, data),
  deleteTestimonial: (id: string) => request('DELETE', `/api/testimonials/${id}`),

  // -- Health check ----------------------------------------------------------
  ping: () => request('GET', '/api/health'),

  // -- Two-step auth (TOTP Authenticator) --------------------------------
  setup2fa: (email: string) => request<TotpSetupResponse>('POST', '/api/auth/setup-2fa', { email }),
  verify2fa: (email: string, token: string) => request<null>('POST', '/api/auth/verify-2fa', { email, token }),
  check2fa: (email: string) => request<TotpStatusResponse>('GET', `/api/auth/2fa-status?email=${encodeURIComponent(email)}`),
  reset2fa: (email: string) => request<null>('POST', '/api/auth/reset-2fa', { email }),

  // -- File upload -----------------------------------------------------------
  uploadImage: async (file: File): Promise<ApiResponse<{ url: string }>> => {
    const baseUrl = getApiUrl() || '/api';
    const uploadUrl = baseUrl.endsWith('/api')
      ? baseUrl.replace(/\/api$/, '') + '/api/upload'
      : `${baseUrl}/api/upload`;
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(uploadUrl, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        const text = await res.text();
        return { data: null, error: `API Error ${res.status}: ${text}`, ok: false };
      }
      const json = await res.json();
      return { data: json, error: null, ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      return { data: null, error: msg, ok: false };
    }
  },

  // -- Contacts ---------------------------------------------------------------
  getContacts: () => request<Contact[]>('GET', '/api/contacts'),
  deleteContact: (id: string | number) => request('DELETE', `/api/contacts?id=${encodeURIComponent(String(id))}`),

  // -- Sync all shortcut -----------------------------------------------------
  syncAll: (payload: unknown) => request('POST', '/api/sync', payload),
};

export type { ApiResponse };
