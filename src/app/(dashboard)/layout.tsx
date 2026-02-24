import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";
import { ToastProvider } from "@/components/toast-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="flex h-screen bg-zinc-50">
        <Suspense>
          <Sidebar />
        </Suspense>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </ToastProvider>
  );
}
