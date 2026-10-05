'use client';

import ConversationItem from './ConversationItem';

type Conversation = { id: number; date: string };

export default function Menu({ conversations }: { conversations: Conversation[] }) {
  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-slate-300 bg-slate-100 text-start">
      <div className="flex items-center gap-2 border-b border-slate-300 px-5 py-7 text-heading-xs text-brand-velvet">
        NEWSFOUNDRY 🤖
      </div>
      <nav className="flex-1 overflow-y-auto">
        <ul>
          {conversations.map((c) => (
            <li key={c.id} className="border-b border-slate-300">
              <ConversationItem date={c.date} />
            </li>
          ))}
        </ul>
      </nav>
      <div className="px-5 py-7">
        <button
          type="button"
          className="flex cursor-pointer items-center gap-2 text-body-xs text-slate-dark"
        >
          <span className="text-xl">🚪</span>
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
