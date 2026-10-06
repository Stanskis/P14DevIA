'use client';

import { useEffect, useRef, useState } from 'react';
import { chatsApi } from '@/lib/api';
import type { Chat, Message } from '@/types/types';

type Tab = 'chat' | 'revues';

interface ChatPanelProps {
  chatId: number | null;
  onChatCreated?: (newChat: Chat) => void;
  onChatUpdated?: () => void;
}

export default function ChatPanel({
  chatId,
  onChatCreated,
  onChatUpdated,
}: ChatPanelProps) {
  const [tab, setTab] = useState<Tab>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const skipNextFetch = useRef(false);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }
    // Le chat vient d'être créé dans handleSubmit : pas besoin de recharger l'historique
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    const userText = input.trim();
    setInput('');
    setError(null);

    try {
      setIsSending(true);

      // Affichage optimiste du message de l'utilisateur
      setMessages((prev) => [...prev, { role: 'user', content: userText }]);

      let currentChatId = chatId;

      // Si le chat n'existe pas encore, on le crée avant le premier message
      if (!currentChatId) {
        const newChat = await chatsApi.createChat();
        currentChatId = newChat.id;
        skipNextFetch.current = true;
        onChatCreated?.(newChat);
      }

      const updatedChat = await chatsApi.sendMessage(currentChatId, userText);
      setMessages(updatedChat.messages);
      onChatUpdated?.();
    } catch (err) {
      console.error("Erreur lors de l'envoi du message:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    } finally {
      setIsSending(false);
    }
  };

  const tabClass = (active: boolean) =>
    `flex cursor-pointer items-center gap-2 rounded-lg px-4 py-panel-pad text-body-xs ${
      active
        ? 'bg-brand-velvet font-semibold text-slate-white'
        : 'bg-slate-200 text-slate-dark'
    }`;

  return (
    <div className="flex h-full flex-col">
      <header className="flex gap-2 border-b border-slate-300 bg-slate-100 px-4 py-5">
        <button
          type="button"
          onClick={() => setTab('chat')}
          className={tabClass(tab === 'chat')}
        >
          💬 Chat
        </button>
        <button
          type="button"
          onClick={() => setTab('revues')}
          className={tabClass(tab === 'revues')}
        >
          📰 Revue de presse
        </button>
      </header>

      <section className="flex flex-1 flex-col overflow-y-auto p-6">
        {tab === 'chat' ? (
          isLoadingHistory ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-body-s text-slate-700">Chargement de la discussion…</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="my-auto flex flex-col items-center justify-center">
              <div className="max-w-xl rounded-2xl bg-slate-white p-12 text-center">
                🤖
                <h1 className="mt-4 text-heading-m text-brand-velvet">
                  Assistant Revue de Presse IA
                </h1>
                <p className="mt-8 text-body-xs text-slate-700">
                  Posez-moi des questions sur l&apos;actualité récente ou demandez-moi de
                  générer une revue de presse sur un sujet spécifique.
                </p>
                <p className="mt-6 text-body-2xs font-semibold text-slate-700">
                  Exemples :
                </p>
                <ul className="mt-2 space-y-2 text-body-2xs text-slate-700">
                  <li>&quot;Quelles sont les dernières nouvelles en politique ?&quot;</li>
                  <li>&quot;Génère une revue de presse sur la technologie&quot;</li>
                  <li>&quot;Résume l&apos;actualité économique de la semaine&quot;</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex flex-col space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-3 text-body-xs ${
                      msg.role === 'user'
                        ? 'bg-brand-velvet text-slate-white'
                        : 'bg-slate-white text-slate-dark shadow-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}

              {isSending && (
                <div className="flex justify-start">
                  <div className="rounded-xl bg-slate-white px-4 py-3 text-body-xs text-slate-700 shadow-sm">
                    <p className="animate-pulse">L&apos;assistant réfléchit…</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-body-s text-slate-700">Revues de presse (à venir)</p>
          </div>
        )}
      </section>

      {error && (
        <p role="alert" className="bg-slate-white px-16 pt-3 text-body-xs text-red-600">
          {error}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex items-start gap-3 bg-slate-white px-16 py-4"
      >
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Tapez votre message ici..."
          disabled={isSending || tab !== 'chat'}
          className="flex-1 resize-none rounded-lg bg-slate-200 px-3 py-2 text-body-xs text-slate-dark outline-none placeholder:text-slate-700 focus:ring-1 focus:ring-brand-velvet disabled:opacity-50"
        />
        <button
          type="submit"
          aria-label="Envoyer"
          disabled={isSending || !input.trim() || tab !== 'chat'}
          className="flex h-10 w-12 cursor-pointer items-center justify-center rounded-lg bg-brand-velvet text-slate-white disabled:opacity-50"
        >
          ✉️
        </button>
      </form>
    </div>
  );
}
