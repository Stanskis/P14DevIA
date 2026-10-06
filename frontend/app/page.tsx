'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Menu from '@/components/Menu';
import ChatPanel from '@/components/ChatPanel';
import { useAuth } from '@/context/AuthContext';

const conversations = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  date: '10/12/2026',
}));

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-dark text-slate-white">
        <p className="text-body-s">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Menu conversations={conversations} />
      <main className="flex min-w-0 flex-1 flex-col bg-slate-400">
        <ChatPanel />
      </main>
    </div>
  );
}
