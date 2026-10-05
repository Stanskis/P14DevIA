'use client';

import { useState } from 'react';

type Tab = 'chat' | 'revues';

export default function ChatPanel() {
  const [tab, setTab] = useState<Tab>('chat');

  const tabClass = (active: boolean) =>
    `flex cursor-pointer items-center gap-2 rounded-lg px-4 py-panel-pad text-body-xs ${
      active
        ? 'bg-brand-velvet font-semibold text-slate-white'
        : 'bg-slate-200 text-slate-dark'
    }`;

  return (
    <>
      <header className="flex gap-2 border-b-1 border-slate-300 bg-slate-100 px-4 py-5">
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

      <section className="flex flex-1 items-center justify-center overflow-y-auto p-6">
        {tab === 'chat' ? (
          <div className="max-w-xl rounded-2xl bg-slate-white p-12 text-center">
            🤖
            <h1 className="mt-4 text-heading-m text-brand-velvet">
              Assistant Revue de Presse IA
            </h1>
            <p className="mt-8 text-body-xs text-slate-700">
              Posez-moi des questions sur l&apos;actualité récente ou demandez-moi de
              générer une revue de presse sur un sujet spécifique.
            </p>
            <p className="mt-6 text-body-2xs font-semibold text-slate-700">Exemples :</p>
            <ul className="mt-2 space-y-2 text-body-2xs text-slate-700">
              <li>&quot;Quelles sont les dernières nouvelles en politique ?&quot;</li>
              <li>&quot;Génère une revue de presse sur la technologie&quot;</li>
              <li>&quot;Résume l&apos;actualité économique de la semaine&quot;</li>
            </ul>
          </div>
        ) : (
          <p className="text-body-s text-slate-700">Revues de presse (à venir)</p>
        )}
      </section>

      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex items-start gap-3 bg-slate-white px-16 py-4"
      >
        <textarea
          rows={2}
          placeholder="Tapez votre message ici..."
          className="flex-1 resize-none rounded-lg bg-slate-200 px-3 py-2 text-body-xs text-slate-dark outline-none placeholder:text-slate-700 focus:ring-1 focus:ring-brand-velvet"
        />
        <button
          type="submit"
          aria-label="Envoyer"
          className="flex h-10 w-12 cursor-pointer items-center justify-center rounded-lg bg-brand-velvet text-slate-white"
        >
          ✉️
        </button>
      </form>
    </>
  );
}
