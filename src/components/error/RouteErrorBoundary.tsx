import { Component, type ErrorInfo, type ReactNode } from "react";
import { logClientError } from "@/lib/clientErrorLogger";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

/**
 * Top-level error boundary around the routing layer. Captures uncaught render
 * errors (e.g. missing context providers) and shows a readable diagnostic panel
 * instead of a blank screen.
 */
export default class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info });
    logClientError({
      kind: "route_error_boundary",
      message: error.message,
      stack: error.stack,
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
      extra: { componentStack: info.componentStack },
    });
  }

  private handleReset = () => {
    this.setState({ error: null, info: null });
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    const isContextError = /must be used within|Provider/i.test(error.message);

    return (
      <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center p-6">
        <div className="max-w-2xl w-full rounded-lg border border-destructive/40 bg-card p-6 shadow-lg space-y-4">
          <div>
            <h1 className="text-xl font-semibold text-destructive">
              Algo salió mal al renderizar la aplicación
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isContextError
                ? "Un componente intentó usar un contexto fuera de su Provider."
                : "Se produjo un error no controlado en la interfaz."}
            </p>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="font-medium text-muted-foreground">Mensaje: </span>
              <code className="text-foreground break-all">{error.message}</code>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Ruta: </span>
              <code className="text-foreground">{window.location.pathname}</code>
            </div>
            {error.stack && (
              <details className="mt-2">
                <summary className="cursor-pointer text-muted-foreground">Stack</summary>
                <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted p-2 text-[11px] leading-snug">
                  {error.stack}
                </pre>
              </details>
            )}
            {info?.componentStack && (
              <details>
                <summary className="cursor-pointer text-muted-foreground">
                  Component stack
                </summary>
                <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted p-2 text-[11px] leading-snug">
                  {info.componentStack}
                </pre>
              </details>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={this.handleReset}
              className="px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90"
            >
              Reintentar
            </button>
            <button
              onClick={this.handleGoHome}
              className="px-3 py-2 text-sm rounded-md border border-border hover:bg-muted"
            >
              Ir al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }
}
