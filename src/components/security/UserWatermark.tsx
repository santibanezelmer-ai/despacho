import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";

const PUBLIC_ROUTES = ["/landing", "/login", "/register", "/reset-password", "/pending"];

/**
 * Discreet diagonal watermark that overlays operational screens with the
 * current user's email + timestamp. Intent: deter screenshot leaks by making
 * any captured image traceable back to the leaking account.
 *
 * Pointer-events: none so it never blocks interaction.
 */
export default function UserWatermark() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;
  if (PUBLIC_ROUTES.some((r) => location.pathname.startsWith(r))) return null;

  const label = `${user.email ?? user.id} · ${new Date().toISOString().slice(0, 10)}`;
  // Build a tiled SVG background with rotated text — very low opacity.
  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='420' height='220'>
      <text x='0' y='110' fill='hsl(0 0% 100% / 0.045)' font-size='13'
            font-family='monospace' transform='rotate(-22 0 110)'>${label}</text>
    </svg>`
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9999] select-none"
      style={{
        backgroundImage: `url("data:image/svg+xml;utf8,${svg}")`,
        backgroundRepeat: "repeat",
        mixBlendMode: "overlay",
      }}
    />
  );
}
