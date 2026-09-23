import { Check, Circle } from "lucide-react";
import { PASSWORD_RULES } from "@/lib/password";

/** Lista das regras da senha que vai marcando cada uma conforme a pessoa digita. */
export default function PasswordRules({ value }: { value: string }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1" aria-label="Regras da senha">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(value);
        return (
          <li
            key={rule.id}
            className={`inline-flex items-center gap-1 text-xs transition-colors ${ok ? "text-success" : "text-muted-light"}`}
          >
            {ok ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
