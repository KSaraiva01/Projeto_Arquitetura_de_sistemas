interface InfoHubLogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  variant?: "light" | "dark" | "auto";
}

function LogoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="40" height="40" rx="10" fill="currentColor" className="text-primary" />
      <path d="M12 20h4l3-6 4 12 3-6h4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="10" r="2.5" fill="white" />
      <circle cx="12" cy="28" r="2" fill="white" opacity="0.7" />
      <circle cx="28" cy="28" r="2" fill="white" opacity="0.7" />
      <line x1="20" y1="12.5" x2="20" y2="14" stroke="white" strokeWidth="1.5" opacity="0.5" />
      <line x1="13.5" y1="26.5" x2="15" y2="24" stroke="white" strokeWidth="1.5" opacity="0.4" />
      <line x1="26.5" y1="26.5" x2="25" y2="24" stroke="white" strokeWidth="1.5" opacity="0.4" />
    </svg>
  );
}

const sizeConfig = {
  sm: { icon: "w-8 h-8", text: "text-lg", tagline: "text-[10px]", gap: "gap-2" },
  md: { icon: "w-10 h-10", text: "text-xl", tagline: "text-xs", gap: "gap-2.5" },
  lg: { icon: "w-14 h-14", text: "text-3xl", tagline: "text-sm", gap: "gap-3" },
};

export default function InfoHubLogo({
  size = "md",
  showTagline = false,
  variant = "auto",
}: InfoHubLogoProps) {
  const cfg = sizeConfig[size];
  const infoColor =
    variant === "light" ? "text-white" : variant === "dark" ? "text-foreground" : "text-foreground";
  const taglineColor = variant === "light" ? "text-gray-300" : "text-muted";

  return (
    <div className="flex flex-col">
      <div className={`flex items-center ${cfg.gap}`}>
        <LogoIcon className={cfg.icon} />
        <span className={`${cfg.text} font-bold leading-tight tracking-tight`}>
          <span className={infoColor}>Info</span>
          <span className="text-primary">Hub</span>
        </span>
      </div>
      {showTagline && (
        <p className={`${cfg.tagline} ${taglineColor} mt-1`}>
          Acompanhamento da Jornada do Empreendedor
        </p>
      )}
    </div>
  );
}

export { LogoIcon };
