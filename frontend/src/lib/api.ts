const API_BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  auth: {
    register: (body: object) => request<{ token: string; user: object }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: object) => request<{ token: string; user: object }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    me: () => request('/auth/me'),
    updateProfile: (body: object) => request('/auth/profile', { method: 'PATCH', body: JSON.stringify(body) }),
  },
  drivers: {
    available: () => request('/drivers/available'),
    updateStatus: (body: object) => request('/drivers/status', { method: 'PATCH', body: JSON.stringify(body) }),
    dashboard: () => request('/drivers/dashboard'),
  },
  rides: {
    request: (body: object) => request('/rides/request', { method: 'POST', body: JSON.stringify(body) }),
    pending: () => request('/rides/pending'),
    my: () => request('/rides/my'),
    active: () => request('/rides/active'),
    get: (id: string) => request(`/rides/${id}`),
    accept: (id: string) => request(`/rides/${id}/accept`, { method: 'POST' }),
    updateStatus: (id: string, body: object) => request(`/rides/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) }),
    analytics: () => request('/rides/analytics/demand'),
  },
  ratings: {
    create: (body: object) => request('/ratings', { method: 'POST', body: JSON.stringify(body) }),
    forDriver: (driverId: string) => request(`/ratings/driver/${driverId}`),
  },
};
