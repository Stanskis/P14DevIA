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

  const send = async (text: string): Promise<boolean> => {
    const content = text.trim();
    if (!content || isSending) return false;
    setError(null);

    const optimistic: Message = {
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };

    try {
      setIsSending(true);
      setMessages((prev) => [...prev, optimistic]);

      let currentChatId = chatId;

      if (!currentChatId) {
        const newChat = await chatsApi.createChat();
        currentChatId = newChat.id;
        skipNextFetch.current = true;
        onChatCreated?.(newChat);
      }

      const updatedChat = await chatsApi.sendMessage(currentChatId, content);
      setMessages(updatedChat.messages);
      onChatUpdated?.();
      return true;
    } catch (err) {
      console.error("Erreur lors de l'envoi du message:", err);
      // Retirer le message optimiste : le serveur ne l'a pas enregistré
      setMessages((prev) => prev.filter((m) => m !== optimistic));
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi");
      return false;
    } finally {
      setIsSending(false);
    }
  };

  return { messages, isSending, isLoadingHistory, error, send };
}
