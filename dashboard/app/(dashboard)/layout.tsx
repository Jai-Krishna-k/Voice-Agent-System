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
      <main className="ml-52">
        <div className="px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
