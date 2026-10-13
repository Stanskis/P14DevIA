'use client';

import { useEffect, useState } from 'react';
import { chatsApi, reviewsApi } from '@/lib/api';
import type { Review } from '@/types/types';

/** Liste des revues de presse et génération d'une nouvelle revue. */
export function useReviews(active: boolean) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // La liste est rechargée à chaque ouverture de l'onglet « Revue de presse »
  useEffect(() => {
    if (!active) return;
    reviewsApi
      .getReviews()
      .then(setReviews)
      .catch((err) => console.error('Erreur lors du chargement des revues:', err));
  }, [active]);

  /** Retourne true si la revue a bien été générée. */
  const generate = async (chatId: number, theme: string): Promise<boolean> => {
    if (!theme.trim() || isGenerating) return false;
    try {
      setIsGenerating(true);
      setError(null);
      await chatsApi.generateReview(chatId, theme.trim());
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération');
      return false;
    } finally {
      setIsGenerating(false);
    }
  };

  const clearError = () => setError(null);

  return { reviews, isGenerating, error, clearError, generate };
}
