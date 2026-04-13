import Sidebar from "@/components/Sidebar";
import RealtimeRefresher from "@/components/RealtimeRefresher";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <RealtimeRefresher />
      <Sidebar />
      <main className="ml-60">
        <div className="p-8 max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
