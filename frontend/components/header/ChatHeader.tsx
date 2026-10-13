'use client';

export type Tab = 'chat' | 'revues';

interface ChatHeaderProps {
  inConversation: boolean;
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  onNewChat?: () => void;
  onOpenReviewModal: () => void;
}

const headerClass = 'flex h-20 items-center border-b border-slate-300 bg-slate-100 px-4';

const tabClass = (active: boolean) =>
  `flex cursor-pointer items-center gap-2 rounded-lg px-4 py-panel-pad text-body-xs ${
    active
      ? 'bg-brand-velvet font-semibold text-slate-white'
      : 'bg-slate-200 text-slate-dark'
  }`;

export default function ChatHeader({
  inConversation,
  tab,
  onTabChange,
  onNewChat,
  onOpenReviewModal,
}: ChatHeaderProps) {
  if (inConversation) {
    return (
      <header className={`${headerClass} justify-between`}>
        <button
          type="button"
          onClick={onNewChat}
          aria-label="Retour, nouvelle discussion"
          className="flex cursor-pointer items-center gap-3 text-start text-brand-velvet"
        >
          <span aria-hidden="true" className="text-body-m">
            ←
          </span>
          <span>
            <span className="block text-body-s text-slate-dark">Nouvelle discussion</span>
            <span className="block text-body-2xs text-slate-700">
              Conversation active
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onOpenReviewModal}
          className="cursor-pointer rounded-lg bg-brand-velvet px-4 py-4 text-body-xs text-slate-white"
        >
          📄 Générer une revue de presse
        </button>
      </header>
    );
  }

  return (
    <header className={`${headerClass} gap-2`}>
      <button
        type="button"
        onClick={() => onTabChange('chat')}
        className={tabClass(tab === 'chat')}
      >
        💬 Chat
      </button>
      <button
        type="button"
        onClick={() => onTabChange('revues')}
        className={tabClass(tab === 'revues')}
      >
        📰 Revue de presse
      </button>
    </header>
  );
}
