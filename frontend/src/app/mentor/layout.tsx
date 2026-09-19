import AppShell from "@/components/AppShell";

export default function MentorLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="mentor">{children}</AppShell>;
}
