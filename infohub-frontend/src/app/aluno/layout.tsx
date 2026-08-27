import Sidebar from "@/components/Sidebar";

export default function AlunoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role="aluno" />
      <div className="flex-1 ml-64">
        {children}
      </div>
    </div>
  );
}
