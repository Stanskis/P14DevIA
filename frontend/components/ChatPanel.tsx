'use client';

import { useEffect, useRef, useState } from 'react';
import ChatHeader from './header/ChatHeader';
import ReviewModal from './modal/ReviewModal';
import ReviewCard from './ReviewCard';
import { useChatMessages } from './hooks/useChatMessages';
import { useReviews } from './hooks/useReviews';
import type { Chat } from '@/types/types';
import { formatTime } from '@/lib/format';
import { RobotIcon } from '@/public/icons/RobotIcon';
import { UserIcon } from '@/public/icons/UserIcon';
import { SendIcon } from '@/public/icons/SendIcon';

type Tab = 'chat' | 'revues';

interface ChatPanelProps {
  chatId: number | null;
  onNewChat?: () => void;
  onChatCreated?: (newChat: Chat) => void;
  onChatUpdated?: () => void;
}

export default function ChatPanel({
  chatId,
  onNewChat,
  onChatCreated,
  onChatUpdated,
}: ChatPanelProps) {
  const [tab, setTab] = useState<Tab>('chat');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [input, setInput] = useState('');

  const chat = useChatMessages({ chatId, onChatCreated, onChatUpdated });
  const reviews = useReviews(tab === 'revues');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const inConversation = tab === 'chat' && (chatId !== null || chat.messages.length > 0);

  const openReviewModal = () => {
    reviews.clearError();
    setShowReviewModal(true);
  };

  const closeReviewModal = () => {
    if (reviews.isGenerating) return;
    setShowReviewModal(false);
  };

  const handleGenerateReview = async (theme: string) => {
    if (!chatId) return;
    const ok = await reviews.generate(chatId, theme);
    if (ok) {
      setShowReviewModal(false);
      setTab('revues');
    }
  };

  useEffect(() => {
    if (!showReviewModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeReviewModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showReviewModal, reviews.isGenerating]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages, chat.isSending]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chat.isSending) return;

    const userText = input;
    setInput('');
    const ok = await chat.send(userText);
    if (!ok) setInput(userText);
  };

  const avatarClass = (role: 'user' | 'assistant') =>
    `flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-body-2xs ${
      role === 'user' ? 'bg-slate-dark text-slate-white' : 'bg-slate-300'
    }`;

  return (
    <div className="flex h-full flex-col">
      <ChatHeader
        inConversation={inConversation}
        tab={tab}
        onTabChange={setTab}
        onNewChat={onNewChat}
        onOpenReviewModal={openReviewModal}
      />

      <section className="flex flex-1 flex-col overflow-y-auto p-6">
        {tab === 'chat' ? (
          chat.isLoadingHistory ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-body-s text-slate-700">Chargement de la discussion…</p>
            </div>
          ) : chat.messages.length === 0 ? (
            <div className="my-auto flex flex-col items-center justify-center">
              <div className="max-w-xl rounded-2xl bg-slate-white p-12 text-center">
                <RobotIcon className="text-brand-velvet mx-auto" />
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
              {chat.messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={index}
                    className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <span aria-hidden="true" className={avatarClass('assistant')}>
                        <RobotIcon className="text-brand-velvet" />
                      </span>
                    )}

                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-3 text-body-xs ${
                        isUser
                          ? 'bg-slate-dark text-slate-white'
                          : 'bg-slate-white text-slate-dark shadow-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {msg.created_at && (
                        <p
                          className={`mt-2 text-body-2xs ${isUser ? 'text-slate-600' : 'text-slate-700'}`}
                        >
                          {formatTime(msg.created_at)}
                        </p>
                      )}
                    </div>

                    {isUser && (
                      <span aria-hidden="true" className={avatarClass('user')}>
                        <UserIcon />
                      </span>
                    )}
                  </div>
                );
              })}
              {chat.isSending && (
                <div className="flex items-start gap-3 justify-start">
                  <span aria-hidden="true" className={avatarClass('assistant')}>
                    <RobotIcon className="text-brand-velvet" />
                  </span>
                  <div className="max-w-[80%] rounded-lg px-4 py-3 text-body-xs bg-slate-white text-slate-dark shadow-sm animate-pulse">
                    <p className="whitespace-pre-wrap">Generation en cours...</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
            <div>
              <h1 className="text-heading-m text-slate-dark">Revues de Presse</h1>
              <p className="text-body-xs text-slate-700">
                Consultez et gérez vos revues de presse générées par l&apos;IA
              </p>
            </div>
            {reviews.reviews.length === 0 ? (
              <p className="text-body-s text-slate-700">
                Aucune revue de presse pour le moment.
              </p>
            ) : (
              reviews.reviews.map((r) => <ReviewCard key={r.chat_id} review={r} />)
            )}
          </div>
        )}
      </section>

      {chat.error && !showReviewModal && (
        <p role="alert" className="bg-slate-white px-16 pt-3 text-body-xs text-red-600">
          {chat.error}
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
          aria-label="Tapez votre message ici"
          disabled={chat.isSending || tab !== 'chat'}
          className="flex-1 resize-none rounded-lg bg-slate-200 px-3 py-2 text-body-xs text-slate-dark outline-none placeholder:text-slate-700 focus:ring-1 focus:ring-brand-velvet disabled:opacity-50"
        />
        <button
          type="submit"
          aria-label="Envoyer"
          disabled={chat.isSending || !input.trim() || tab !== 'chat'}
          className="flex h-10 w-12 cursor-pointer items-center justify-center rounded-lg bg-brand-velvet text-slate-white disabled:opacity-50"
        >
          <SendIcon />
        </button>
      </form>

      {showReviewModal && (
        <ReviewModal
          isGenerating={reviews.isGenerating}
          error={reviews.error}
          onSubmit={handleGenerateReview}
          onClose={closeReviewModal}
        />
      )}
    </div>
  );
}
