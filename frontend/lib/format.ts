export function formatChatDate(iso: string): string {
  const hasZone = /Z|[+-]\d{2}:\d{2}$/.test(iso);
  const date = new Date(hasZone ? iso : `${iso}Z`);

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}
