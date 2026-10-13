'use client';

import { useEffect, useState } from 'react';

interface ReviewModalProps {
  isGenerating: boolean;
  error: string | null;
  onSubmit: (theme: string) => void;
  onClose: () => void;
}

export default function ReviewModal({
  isGenerating,
  error,
  onSubmit,
  onClose,
}: ReviewModalProps) {
  // Le composant est démonté à la fermeture : le champ est donc remis à zéro automatiquement
  const [theme, setTheme] = useState('');

  const close = () => {
    if (!isGenerating) onClose();
  };

  // Fermeture avec Échap
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!theme.trim() || isGenerating) return;
    onSubmit(theme);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-title"
      className="fixed inset-0 z-10 flex items-center justify-center bg-slate-dark/60 p-4"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-white p-10">
        <button
          type="button"
          onClick={close}
          className="absolute right-6 top-5 cursor-pointer text-body-xs text-slate-700 hover:text-slate-dark"
        >
          Fermer
        </button>
        <h2
          id="review-title"
          className="text-center text-heading-s font-semibold text-slate-dark"
        >
          Générer une revue de presse
        </h2>
        <p className="mt-2 text-center text-body-xs text-slate-700">
          Donner un titre à votre revue de presse
        </p>
        <form onSubmit={handleSubmit} className="mt-8">
          <label htmlFor="review-theme" className="block text-body-s text-slate-dark">
            Thème de la revue de presse
          </label>
          <input
            id="review-theme"
            autoFocus
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            disabled={isGenerating}
            className="mt-2 w-full rounded-lg bg-slate-300 px-3 py-2 text-body-xs text-slate-dark outline-none focus:ring-2 focus:ring-brand-velvet disabled:opacity-50"
          />

          {error && (
            <p role="alert" className="mt-3 text-body-xs text-red-600">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={!theme.trim() || isGenerating}
            className="mt-4 w-full cursor-pointer rounded-md bg-slate-dark py-3 text-body-xs text-slate-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? 'Génération…' : 'Générer'}
          </button>
        </form>
      </div>
    </div>
  );
}
