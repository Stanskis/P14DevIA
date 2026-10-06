'use client';

import ConversationItem from './ConversationItem';
import { useAuth } from '@/context/AuthContext';
import type { Chat } from '@/types/types';
import { formatChatDate } from '@/lib/format';

interface MenuProps {
  conversations: Chat[];
  activeChatId?: number | null;
  onSelectChat: (id: number) => void;
  onNewChat?: () => void;
  isLoading?: boolean;
}

export default function Menu({
  conversations,
  activeChatId,
  onSelectChat,
  isLoading,
}: MenuProps) {
  const { logout } = useAuth();

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-slate-300 bg-slate-100 text-start">
      <div className="flex items-center border-b border-slate-300 px-5 py-7 text-heading-xs text-brand-velvet">
        NEWSFOUNDRY 🤖
      </div>

      <nav className="flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="p-5 text-body-2xs text-slate-700">Chargement…</p>
        ) : conversations.length === 0 ? (
          <p className="p-5 text-body-2xs text-slate-700">Aucune discussion</p>
        ) : (
          <ul>
            {conversations.map((c) => (
              <li key={c.id} className="border-b border-slate-300">
                <ConversationItem
                  date={formatChatDate(c.created_at)}
                  active={c.id === activeChatId}
                  onClick={() => onSelectChat(c.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </nav>

      <div className="border-t border-slate-300 px-5 py-7">
        <button
          type="button"
          onClick={logout}
          className="flex cursor-pointer items-center gap-2 text-body-xs text-slate-dark hover:text-brand-velvet transition-colors"
        >
          <span className="text-xl">🚪</span>
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
