/**
 * Housio mark: an architectural frame with an arched doorway and a door leaf
 * swung open in perspective, suggesting stepping inside a space.
 */
export function LogoMark({ size = 32, className = "", inverse = false }: { size?: number; className?: string; inverse?: boolean }) {
  const frame = inverse ? "#F6F2EA" : "#193D35";
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect x="3" y="3" width="42" height="42" rx="11" fill={frame} />
      <path d="M15 38V21a9 9 0 0 1 18 0v17" fill="none" stroke={inverse ? "#193D35" : "#F6F2EA"} strokeWidth="3" strokeLinecap="round" />
      <path d="M24 38V18.6l8.2 3.4V38z" fill="#C7A775" />
      <circle cx="29.4" cy="29" r="1.2" fill={frame} />
      <path d="M11 38h26" stroke="#C7A775" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ inverse = false, size = 32 }: { inverse?: boolean; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} inverse={inverse} />
      <span className={`font-display text-[1.35rem] font-extrabold tracking-tight ${inverse ? "text-ivory" : "text-forest"}`}>
        housio<span className="text-champagne">.</span>
      </span>
      <span className="sr-only">Housio</span>
    </span>
  );
}
