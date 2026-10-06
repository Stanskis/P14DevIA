import type { FormFields, Chat } from '@/types/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Erreur lors de la requête');
  }

  const data = await response.json();
  return data.data || data;
}

export const authApi = {
  login: (data: FormFields) =>
    fetchWithAuth('/login', { method: 'POST', body: JSON.stringify(data) }),
};

export const chatsApi = {
  getChats: (): Promise<Chat[]> => fetchWithAuth('/chats', { method: 'GET' }),

  createChat: (): Promise<Chat> => fetchWithAuth('/chats', { method: 'POST' }),

  getChatById: (chatId: number): Promise<Chat> =>
    fetchWithAuth(`/chats/${chatId}`, { method: 'GET' }),

  sendMessage: (chatId: number, content: string): Promise<Chat> =>
    fetchWithAuth(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
};
