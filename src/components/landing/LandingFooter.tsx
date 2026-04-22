export default function LandingFooter() {
  return (
    <footer className="border-t border-border/30 px-4 sm:px-6 py-8 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <img src="/favicon.png" alt="Operix" className="h-5 w-5 rounded" />
          <span className="font-semibold text-foreground">Operix</span>
          <span className="text-xs">v4.0</span>
        </div>
        <p className="text-xs text-muted-foreground/50">
          Plataforma de despacho en tiempo real para cuerpos de bomberos
        </p>
      </div>
    </footer>
  );
}
