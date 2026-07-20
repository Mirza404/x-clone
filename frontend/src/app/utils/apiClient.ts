import axios from 'axios';

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_SERVER_URL });

type CachedToken = { token: string; expiresAt: number };
let cachedToken: CachedToken | null = null;
let pendingFetch: Promise<CachedToken | null> | null = null;

const REFRESH_MARGIN_MS = 30 * 1000;

async function fetchBackendToken(): Promise<CachedToken | null> {
  try {
    const response = await axios.get('/api/auth/backend-token');
    const { token, expiresAt } = response.data;
    cachedToken = { token, expiresAt };
    return cachedToken;
  } catch {
    cachedToken = null;
    return null;
  }
}

export async function getBackendToken(): Promise<CachedToken | null> {
  if (cachedToken && cachedToken.expiresAt - Date.now() > REFRESH_MARGIN_MS) {
    return cachedToken;
  }

  if (!pendingFetch) {
    pendingFetch = fetchBackendToken().finally(() => {
      pendingFetch = null;
    });
  }

  return pendingFetch;
}

export function clearBackendToken() {
  cachedToken = null;
}

api.interceptors.request.use(async (config) => {
  const cached = await getBackendToken();
  if (cached) {
    config.headers.Authorization = `Bearer ${cached.token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retried
    ) {
      originalRequest._retried = true;
      clearBackendToken();
      const cached = await getBackendToken();
      if (cached) {
        originalRequest.headers.Authorization = `Bearer ${cached.token}`;
        return api(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
