import Sidebar from "@/components/Sidebar";

export default function IntegranteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role="integrante" />
      <div className="flex-1 ml-64">
        {children}
      </div>
    </div>
  );
}
