"use client";

import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { allNavItems } from "@/lib/nav";
import { CommandPaletteTrigger } from "./command-palette";
import { NotificationsDrawer } from "./notifications-drawer";

export function Topbar() {
  const pathname = usePathname();
  const current = allNavItems.find((i) => (i.href === "/" ? pathname === "/" : pathname.startsWith(i.href)))?.label ?? "Comando Central";

  return (
    <header className="flex h-14 shrink-0 items-center gap-3.5 border-b px-5">
      <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
        <span>Mega System</span>
        <span className="opacity-50">/</span>
        <span className="font-semibold text-foreground">{current}</span>
      </div>

      <div className="flex-1">
        <CommandPaletteTrigger />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--good)] opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-[var(--good)]" />
          </span>
          Operacional
        </span>
        <NotificationsDrawer />
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Ação rápida"
        >
          <Plus className="size-4.5" />
        </button>
      </div>
    </header>
  );
}
