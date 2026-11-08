import { Suspense } from "react";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { CommandPalette } from "@/components/shell/command-palette";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh min-h-0 w-full overflow-hidden">
      <Suspense fallback={<div className="hidden h-dvh w-[230px] shrink-0 border-r bg-sidebar md:block" />}>
        <Sidebar />
      </Suspense>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Suspense fallback={<div className="h-14 shrink-0 border-b" />}>
          <Topbar />
        </Suspense>
        <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-5 md:px-7 md:py-6.5 md:pb-16">
          <div className="mx-auto w-full max-w-[1280px] min-w-0">{children}</div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
