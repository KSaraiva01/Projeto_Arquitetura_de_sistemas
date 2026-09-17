import AppShell from "@/components/AppShell";

export default function AlunoLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="aluno">{children}</AppShell>;
}
