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

export type ArticleSummary = { title: string; summary: string; url: string | null };
export type Review = {
  chat_id: number;
  title: string;
  summary: string;
  articles: ArticleSummary[];
  created_at: string;
};
