import { useEffect, useState } from 'react';
import { resolveLogoUrl } from '@/lib/logoStorage';
import { Building2 } from 'lucide-react';

interface LogoProps {
  /** Stored value: storage path in the `logos` bucket, or a full URL. */
  src?: string | null;
  alt?: string;
  className?: string;
  /** Shown while resolving or when no logo exists. */
  fallback?: React.ReactNode;
  /** If true, render nothing when there is no logo (no fallback). */
  hideWhenEmpty?: boolean;
}

/**
 * Renders a logo stored in the private `logos` bucket by resolving a
 * short-lived signed URL. Also passes through absolute URLs unchanged.
 */
export function Logo({ src, alt = '', className, fallback, hideWhenEmpty }: LogoProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    if (!src) { setUrl(null); return; }
    resolveLogoUrl(src).then(u => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [src]);

  if (!src || error) {
    if (hideWhenEmpty) return null;
    return <>{fallback ?? <Building2 className={className ?? 'h-6 w-6 text-muted-foreground'} />}</>;
  }
  if (!url) {
    return <div className={`${className ?? 'h-6 w-6'} rounded-sm bg-muted animate-pulse`} aria-label={alt} />;
  }
  return (
    <img
      src={url}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
      draggable={false}
    />
  );
}
