interface InfoHubLogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  variant?: "light" | "dark";
}

function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 260" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="bulbGrad" x1="100" y1="0" x2="100" y2="260" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F5A623" />
          <stop offset="40%" stopColor="#E8601C" />
          <stop offset="70%" stopColor="#C93A1E" />
          <stop offset="100%" stopColor="#5C1A1A" />
        </linearGradient>
      </defs>
      {/* Base / socket */}
      <rect x="65" y="210" width="70" height="16" rx="4" fill="#5C1A1A" />
      <rect x="72" y="228" width="56" height="14" rx="4" fill="#4A1515" />
      <rect x="80" y="244" width="40" height="12" rx="6" fill="#3D1010" />
      {/* Network connections */}
      <line x1="100" y1="195" x2="100" y2="210" stroke="url(#bulbGrad)" strokeWidth="3" />
      <line x1="68" y1="175" x2="100" y2="195" stroke="url(#bulbGrad)" strokeWidth="2.5" />
      <line x1="132" y1="175" x2="100" y2="195" stroke="url(#bulbGrad)" strokeWidth="2.5" />
      <line x1="68" y1="175" x2="45" y2="150" stroke="url(#bulbGrad)" strokeWidth="2.5" />
      <line x1="68" y1="175" x2="80" y2="145" stroke="url(#bulbGrad)" strokeWidth="2.5" />
      <line x1="132" y1="175" x2="155" y2="150" stroke="url(#bulbGrad)" strokeWidth="2.5" />
      <line x1="132" y1="175" x2="120" y2="145" stroke="url(#bulbGrad)" strokeWidth="2.5" />
      <line x1="80" y1="145" x2="120" y2="145" stroke="url(#bulbGrad)" strokeWidth="2.5" />
      <line x1="80" y1="145" x2="55" y2="120" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="80" y1="145" x2="100" y2="115" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="120" y1="145" x2="100" y2="115" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="120" y1="145" x2="145" y2="120" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="45" y1="150" x2="30" y2="125" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="155" y1="150" x2="170" y2="125" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="55" y1="120" x2="40" y2="95" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="55" y1="120" x2="75" y2="90" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="100" y1="115" x2="75" y2="90" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="100" y1="115" x2="125" y2="90" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="145" y1="120" x2="125" y2="90" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="145" y1="120" x2="165" y2="95" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="75" y1="90" x2="60" y2="60" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="75" y1="90" x2="100" y2="65" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="125" y1="90" x2="100" y2="65" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="125" y1="90" x2="145" y2="60" stroke="url(#bulbGrad)" strokeWidth="2" />
      <line x1="60" y1="60" x2="40" y2="35" stroke="url(#bulbGrad)" strokeWidth="1.5" />
      <line x1="60" y1="60" x2="85" y2="35" stroke="url(#bulbGrad)" strokeWidth="1.5" />
      <line x1="100" y1="65" x2="85" y2="35" stroke="url(#bulbGrad)" strokeWidth="1.5" />
      <line x1="100" y1="65" x2="120" y2="35" stroke="url(#bulbGrad)" strokeWidth="1.5" />
      <line x1="145" y1="60" x2="120" y2="35" stroke="url(#bulbGrad)" strokeWidth="1.5" />
      <line x1="145" y1="60" x2="165" y2="35" stroke="url(#bulbGrad)" strokeWidth="1.5" />
      <line x1="85" y1="35" x2="100" y2="12" stroke="url(#bulbGrad)" strokeWidth="1.5" />
      <line x1="120" y1="35" x2="100" y2="12" stroke="url(#bulbGrad)" strokeWidth="1.5" />
      {/* Network nodes */}
      <circle cx="100" cy="12" r="10" fill="#F5A623" />
      <circle cx="85" cy="35" r="8" fill="#F5A623" />
      <circle cx="120" cy="35" r="7" fill="#F0A030" />
      <circle cx="40" cy="35" r="6" fill="#F5A623" />
      <circle cx="165" cy="35" r="6" fill="#EE8C22" />
      <circle cx="60" cy="60" r="9" fill="#EE8C22" />
      <circle cx="145" cy="60" r="8" fill="#E87520" />
      <circle cx="100" cy="65" r="7" fill="#E87520" />
      <circle cx="75" cy="90" r="10" fill="#E8601C" />
      <circle cx="125" cy="90" r="9" fill="#E04E1A" />
      <circle cx="40" cy="95" r="6" fill="#E8601C" />
      <circle cx="165" cy="95" r="5" fill="#D94818" />
      <circle cx="55" cy="120" r="8" fill="#D04018" />
      <circle cx="145" cy="120" r="7" fill="#C93A1E" />
      <circle cx="100" cy="115" r="9" fill="#C93A1E" />
      <circle cx="30" cy="125" r="5" fill="#C93A1E" />
      <circle cx="170" cy="125" r="5" fill="#B53020" />
      <circle cx="80" cy="145" r="8" fill="#B53020" />
      <circle cx="120" cy="145" r="7" fill="#A52820" />
      <circle cx="45" cy="150" r="7" fill="#A52820" />
      <circle cx="155" cy="150" r="6" fill="#8E2020" />
      <circle cx="68" cy="175" r="9" fill="#7A1C1C" />
      <circle cx="132" cy="175" r="8" fill="#6E1A1A" />
      <circle cx="100" cy="195" r="10" fill="#5C1A1A" />
    </svg>
  );
}

const sizeConfig = {
  sm: { icon: "w-7 h-7", text: "text-base", tagline: "text-[10px]", gap: "gap-1.5" },
  md: { icon: "w-10 h-10", text: "text-xl", tagline: "text-xs", gap: "gap-2" },
  lg: { icon: "w-16 h-16", text: "text-4xl", tagline: "text-sm", gap: "gap-3" },
};

export default function InfoHubLogo({
  size = "md",
  showTagline = false,
  variant = "dark",
}: InfoHubLogoProps) {
  const cfg = sizeConfig[size];
  const infoColor = variant === "light" ? "text-white" : "text-gray-600";
  const taglineColor = variant === "light" ? "text-gray-300" : "text-gray-400";

  return (
    <div className="flex flex-col">
      <div className={`flex items-center ${cfg.gap}`}>
        <LightbulbIcon className={cfg.icon} />
        <span className={`${cfg.text} font-bold leading-tight tracking-tight`}>
          <span className={infoColor}>info</span>
          <span className="text-primary">hub</span>
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

export { LightbulbIcon };
