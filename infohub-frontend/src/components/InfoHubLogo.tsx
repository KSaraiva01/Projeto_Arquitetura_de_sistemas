interface InfoHubLogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  variant?: "light" | "dark" | "auto";
}

function LogoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="bulbGrad" x1="50" y1="0" x2="50" y2="130" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F5A623" />
          <stop offset="35%" stopColor="#E8741A" />
          <stop offset="60%" stopColor="#E53525" />
          <stop offset="85%" stopColor="#8B1A1A" />
          <stop offset="100%" stopColor="#4A1018" />
        </linearGradient>
      </defs>

      {/* Bulb base */}
      <rect x="32" y="108" width="36" height="8" rx="2" fill="url(#bulbGrad)" />
      <rect x="36" y="118" width="28" height="7" rx="2" fill="url(#bulbGrad)" />

      {/* Connection stems from base to network */}
      <line x1="42" y1="108" x2="38" y2="95" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="50" y1="108" x2="50" y2="92" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="58" y1="108" x2="62" y2="95" stroke="url(#bulbGrad)" strokeWidth="2" />

      {/* Network connections (lines) */}
      <line x1="38" y1="92" x2="50" y2="88" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="50" y1="88" x2="62" y2="92" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="38" y1="92" x2="25" y2="78" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="62" y1="92" x2="75" y2="78" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="50" y1="88" x2="50" y2="70" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="25" y1="78" x2="30" y2="60" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="25" y1="78" x2="15" y2="65" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="75" y1="78" x2="70" y2="60" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="75" y1="78" x2="88" y2="68" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="50" y1="70" x2="30" y2="60" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="50" y1="70" x2="70" y2="60" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="30" y1="60" x2="22" y2="42" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="30" y1="60" x2="45" y2="45" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="70" y1="60" x2="78" y2="42" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="70" y1="60" x2="55" y2="45" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="45" y1="45" x2="55" y2="45" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="22" y1="42" x2="35" y2="28" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="78" y1="42" x2="65" y2="28" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="45" y1="45" x2="35" y2="28" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="55" y1="45" x2="65" y2="28" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="35" y1="28" x2="50" y2="15" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="65" y1="28" x2="50" y2="15" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="15" y1="65" x2="10" y2="50" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="88" y1="68" x2="92" y2="55" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="35" y1="28" x2="25" y2="18" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="65" y1="28" x2="75" y2="18" stroke="url(#bulbGrad)" strokeWidth="2" />

      {/* Network nodes (circles) */}
      <circle cx="38" cy="92" r="4" fill="url(#bulbGrad)" />
      <circle cx="50" cy="88" r="3.5" fill="url(#bulbGrad)" />
      <circle cx="62" cy="92" r="4" fill="url(#bulbGrad)" />
      <circle cx="25" cy="78" r="5" fill="url(#bulbGrad)" />
      <circle cx="75" cy="78" r="5" fill="url(#bulbGrad)" />
      <circle cx="15" cy="65" r="4" fill="url(#bulbGrad)" />
      <circle cx="88" cy="68" r="3.5" fill="url(#bulbGrad)" />
      <circle cx="50" cy="70" r="6" fill="url(#bulbGrad)" />
      <circle cx="30" cy="60" r="5" fill="url(#bulbGrad)" />
      <circle cx="70" cy="60" r="5" fill="url(#bulbGrad)" />
      <circle cx="22" cy="42" r="4" fill="url(#bulbGrad)" />
      <circle cx="78" cy="42" r="4" fill="url(#bulbGrad)" />
      <circle cx="45" cy="45" r="4.5" fill="url(#bulbGrad)" />
      <circle cx="55" cy="45" r="4.5" fill="url(#bulbGrad)" />
      <circle cx="35" cy="28" r="5" fill="url(#bulbGrad)" />
      <circle cx="65" cy="28" r="5" fill="url(#bulbGrad)" />
      <circle cx="50" cy="15" r="6" fill="url(#bulbGrad)" />
      <circle cx="10" cy="50" r="3" fill="url(#bulbGrad)" />
      <circle cx="92" cy="55" r="3" fill="url(#bulbGrad)" />
      <circle cx="25" cy="18" r="3.5" fill="url(#bulbGrad)" />
      <circle cx="75" cy="18" r="3.5" fill="url(#bulbGrad)" />
    </svg>
  );
}

const sizeConfig = {
  sm: { icon: "w-8 h-10", text: "text-lg", tagline: "text-[10px]", gap: "gap-1.5" },
  md: { icon: "w-10 h-13", text: "text-xl", tagline: "text-xs", gap: "gap-2" },
  lg: { icon: "w-16 h-20", text: "text-3xl", tagline: "text-sm", gap: "gap-3" },
};

export default function InfoHubLogo({
  size = "md",
  showTagline = false,
  variant = "auto",
}: InfoHubLogoProps) {
  const cfg = sizeConfig[size];

  const infoColor =
    variant === "light" ? "text-white" : "text-logo-info";
  const hubColor =
    variant === "light" ? "text-white" : "text-logo-hub";
  const taglineColor = variant === "light" ? "text-gray-300" : "text-muted";

  return (
    <div className="flex flex-col">
      <div className={`flex items-center ${cfg.gap}`}>
        <LogoIcon className={cfg.icon} />
        <span className={`${cfg.text} font-bold leading-tight tracking-tight lowercase`}>
          <span className={infoColor}>info</span>
          <span className={hubColor}>hub</span>
        </span>
      </div>
      {showTagline && (
        <p className={`${cfg.tagline} ${taglineColor} mt-1`}>
          Conectando conhecimento, tecnologia &amp; inovação
        </p>
      )}
    </div>
  );
}

export { LogoIcon };
