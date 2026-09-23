import { StickyNote } from 'lucide-react';
import DispatchNotesPanel from '@/components/dispatch/DispatchNotesPanel';

export default function DispatchNotes() {
  return (
    <div className="space-y-6 p-4 lg:p-6">
      <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
        <StickyNote className="h-5 w-5 text-info" />
        Comunicados / Notas
      </h1>
      <DispatchNotesPanel />
    </div>
  );
}