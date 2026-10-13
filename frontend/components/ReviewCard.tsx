'use client';

import { formatChatDate } from '@/lib/format';
import type { Review } from '@/types/types';

export default function ReviewCard({ review }: { review: Review }) {
  const copy = () => {
    const text = [
      review.title,
      '',
      review.summary,
      '',
      ...review.articles.map(
        (a) => `- ${a.title} : ${a.summary}${a.url ? ` (${a.url})` : ''}`,
      ),
    ].join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <article className="rounded-2xl bg-slate-white p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-body-s uppercase text-slate-dark">{review.title}</h2>
          <p className="mt-1 text-body-2xs text-slate-700">
            {formatChatDate(review.created_at)}
          </p>
        </div>
        <button
          type="button"
          onClick={copy}
          className="cursor-pointer rounded-md bg-slate-dark px-5 py-2 text-body-xs text-slate-white"
        >
          Copier
        </button>
      </div>

      <p className="mt-6 whitespace-pre-wrap text-body-xs text-slate-dark">
        {review.summary}
      </p>

      <ul className="mt-4 space-y-3 text-body-xs text-slate-dark">
        {review.articles.map((a, i) => (
          <li key={i}>
            <span className="font-semibold">{a.title}</span> : {a.summary}{' '}
            {a.url && (
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-velvet hover:underline"
              >
                Source
              </a>
            )}
          </li>
        ))}
      </ul>
    </article>
  );
}
