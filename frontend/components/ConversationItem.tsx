'use client';

type Conversation = { date: string; active?: boolean; onClick?: () => void };

export default function ConversationItem({ date, active, onClick }: Conversation) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={`w-full cursor-pointer px-5 py-4 text-start transition-colors ${
        active ? 'bg-slate-200' : 'hover:bg-slate-200/60'
      }`}
    >
      <span className="block text-body-s text-slate-dark">Discussion du</span>
      <span className="block py-1 text-body-2xs text-slate-800">{date}</span>
    </button>
  );
}
