export default function LandingFooter() {
  return (
    <footer className="border-t border-border/40 px-4 sm:px-6 py-6 sm:py-8">
      <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <img src="/favicon.png" alt="Operix" className="h-4 w-4 rounded" />
          Operix v4.0
        </div>
        <p className="text-[10px] sm:text-xs text-muted-foreground/60">Plataforma de despacho bomberil multi-organización</p>
      </div>
    </footer>
  );
}
