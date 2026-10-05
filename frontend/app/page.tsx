import Menu from '@/components/Menu';
import ChatPanel from '@/components/ChatPanel';

// TODO: remplacer par les données de l'API
const conversations = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  date: '10/12/2026',
}));

export default function Home() {
  return (
    <div className="flex h-screen">
      <Menu conversations={conversations} />
      <main className="flex min-w-0 flex-1 flex-col bg-slate-400">
        <ChatPanel />
      </main>
    </div>
  );
}
