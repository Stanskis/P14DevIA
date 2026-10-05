import type { FormFields } from '@/types/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message);
  }

  const data = await response.json();
  return data.data || data;
}

export const authApi = {
  login: (data: FormFields) =>
    fetchWithAuth('/login', { method: 'POST', body: JSON.stringify(data) }),
};
