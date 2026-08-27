import Sidebar from "@/components/Sidebar";

export default function MentorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role="mentor" />
      <div className="flex-1 ml-64">
        {children}
      </div>
    </div>
  );
}
