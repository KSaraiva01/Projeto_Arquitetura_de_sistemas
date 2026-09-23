/**
 * A mesma política de senha do backend (auth.schemas.ts): 8 a 72 caracteres,
 * com ao menos uma letra e um número. Conferir aqui evita a ida e volta à
 * API só para descobrir que faltou um número.
 */
export const PASSWORD_RULES = [
  { id: "length", label: "8 ou mais caracteres", test: (value: string) => value.length >= 8 && value.length <= 72 },
  { id: "letter", label: "ao menos uma letra", test: (value: string) => /[A-Za-zÀ-ÿ]/.test(value) },
  { id: "digit", label: "ao menos um número", test: (value: string) => /\d/.test(value) },
] as const;

export function passwordIsValid(value: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(value));
}

/** Primeira regra não cumprida, em forma de frase — para mensagens de erro. */
export function passwordProblem(value: string): string | null {
  const failed = PASSWORD_RULES.find((rule) => !rule.test(value));
  return failed ? `A senha precisa ter ${failed.label}.` : null;
}
