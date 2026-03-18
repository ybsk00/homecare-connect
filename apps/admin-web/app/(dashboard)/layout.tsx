import AdminSidebar from '@/components/layout/AdminSidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface">
      <AdminSidebar />
      <main className="ml-72">
        {children}
      </main>
    </div>
  );
}
