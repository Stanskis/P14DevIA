'use client';

import { useEffect, useRef, useState } from 'react';
import { chatsApi } from '@/lib/api';
import type { Chat, Message } from '@/types/types';

interface Options {
  chatId: number | null;
  onChatCreated?: (newChat: Chat) => void;
  onChatUpdated?: () => void;
}

/** Historique d'une discussion : chargement, envoi d'un message, états associés. */
export function useChatMessages({ chatId, onChatCreated, onChatUpdated }: Options) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const skipNextFetch = useRef(false);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }
    // Le chat vient d'être créé dans send() : inutile de recharger l'historique
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }

    const fetchHistory = async () => {
      try {
        setIsLoadingHistory(true);
        setError(null);
        const chatData = await chatsApi.getChatById(chatId);
        setMessages(chatData.messages);
      } catch (err) {
        console.error('Erreur lors du chargement de la discussion:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [chatId]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || isSending) return;
    setError(null);

    try {
      setIsSending(true);

      // Affichage optimiste du message de l'utilisateur
      setMessages((prev) => [
        ...prev,
        { role: 'user', content, created_at: new Date().toISOString() },
      ]);

      let currentChatId = chatId;

      // Si la discussion n'existe pas encore, on la crée avant le premier message
      if (!currentChatId) {
        const newChat = await chatsApi.createChat();
        currentChatId = newChat.id;
        skipNextFetch.current = true;
        onChatCreated?.(newChat);
      }

      const updatedChat = await chatsApi.sendMessage(currentChatId, content);
      setMessages(updatedChat.messages);
      onChatUpdated?.();
    } catch (err) {
      console.error("Erreur lors de l'envoi du message:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    } finally {
      setIsSending(false);
    }
  };

  return { messages, isSending, isLoadingHistory, error, send };
}
