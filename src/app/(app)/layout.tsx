import { Suspense } from "react";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { CommandPalette } from "@/components/shell/command-palette";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Suspense fallback={<div className="h-screen w-[230px] shrink-0 border-r bg-sidebar" />}>
        <Sidebar />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<div className="h-14 shrink-0 border-b" />}>
          <Topbar />
        </Suspense>
        <main className="flex-1 overflow-y-auto px-7 py-6.5 pb-16">
          <div className="mx-auto max-w-[1280px]">{children}</div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
