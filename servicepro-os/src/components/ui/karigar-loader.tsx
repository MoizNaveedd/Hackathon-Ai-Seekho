import { cn } from "@/lib/utils";

interface KarigarLoaderProps {
  /** Diameter of the loader in pixels. */
  size?: number;
  /** Optional label shown beneath the logo. */
  label?: string;
  /** Wrapper classes (e.g. layout / sizing of the container). */
  className?: string;
}

/**
 * Branded loading indicator: the Karigar logo gently breathes inside an
 * orbiting ring tinted with the brand color. Use anywhere a spinner would go.
 */
export function KarigarLoader({ size = 64, label, className }: KarigarLoaderProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Orbiting brand ring */}
        <div
          className="absolute inset-0 rounded-full border-[3px] border-[#0D7377]/15 border-t-[#0D7377] animate-karigar-orbit"
        />
        {/* Breathing logo */}
        <img
          src="/logo.png"
          alt="Karigar"
          className="absolute inset-0 m-auto object-contain animate-karigar-breathe"
          style={{ width: size * 0.58, height: size * 0.58 }}
        />
      </div>
      {label && (
        <p className="text-sm font-medium text-muted-foreground animate-pulse">{label}</p>
      )}
    </div>
  );
}

/**
 * Compact inline variant for use inside buttons. Shows just the logo bobbing,
 * sized to sit alongside button text.
 */
export function KarigarLoaderInline({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/logo.png"
      alt=""
      aria-hidden
      className={cn("object-contain animate-karigar-bob", className)}
      style={{ width: size, height: size }}
    />
  );
}
