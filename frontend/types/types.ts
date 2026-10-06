export interface FormFields {
  email: string;
  password: string;
}

export interface User {
  id: number;
  email: string;
}

export type Message = { role: 'user' | 'assistant'; content: string };

export interface Chat {
  id: number;
  user_id: number;
  created_at: string;
  messages: Message[];
}
