'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Menu from '@/components/Menu';
import ChatPanel from '@/components/ChatPanel';
import { useAuth } from '@/context/AuthContext';
import { chatsApi } from '@/lib/api';
import type { Chat } from '@/types/types';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [isChatsLoading, setIsChatsLoading] = useState<boolean>(true);

  const loadChats = async () => {
    try {
      setIsChatsLoading(true);
      const userChats = await chatsApi.getChats();
      setChats(userChats);
    } catch (error) {
      console.error('Erreur lors du chargement des chats:', error);
    } finally {
      setIsChatsLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    } else if (isAuthenticated) {
      loadChats();
    }
  }, [isAuthenticated, isLoading, router]);

  const handleStartNewChat = () => {
    setActiveChatId(null);
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-dark text-slate-white">
        <p className="text-body-s">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Menu
        conversations={chats}
        activeChatId={activeChatId}
        onSelectChat={(id) => setActiveChatId(id)}
        onNewChat={handleStartNewChat}
        isLoading={isChatsLoading}
      />
      <main className="flex min-w-0 flex-1 flex-col bg-slate-400">
        <ChatPanel
          chatId={activeChatId}
          onChatCreated={(newChat) => {
            setChats((prev) => [newChat, ...prev]);
            setActiveChatId(newChat.id);
          }}
          onChatUpdated={loadChats}
        />
      </main>
    </div>
  );
}
