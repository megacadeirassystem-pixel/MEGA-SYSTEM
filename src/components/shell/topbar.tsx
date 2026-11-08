"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { allNavItems } from "@/lib/nav";
import { CommandPaletteTrigger } from "./command-palette";
import { NotificationsDrawer } from "./notifications-drawer";

export function Topbar() {
  const pathname = usePathname();
  const current = allNavItems.find((i) => (i.href === "/" ? pathname === "/" : pathname.startsWith(i.href)))?.label ?? "Comando Central";

  return (
    <div className="shrink-0 border-b bg-background">
      <header className="flex min-h-14 items-center gap-2 px-3 sm:gap-3.5 sm:px-5">
        <div className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground sm:flex">
          <span>Mega System</span>
          <span className="opacity-50">/</span>
          <span className="font-semibold text-foreground">{current}</span>
        </div>

        <div className="min-w-0 flex-1">
          <CommandPaletteTrigger />
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground lg:flex">
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
            aria-label="Ação rápida"
          >
            <Plus className="size-4.5" />
          </button>
        </div>
      </header>

      <nav aria-label="Navegação principal" className="flex gap-1 overflow-x-auto border-t px-2 py-1.5 md:hidden">
        {allNavItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors ${active ? "bg-[var(--signal-dim)] text-foreground" : "text-muted-foreground hover:bg-accent"}`}
            >
              <Icon className={`size-4 shrink-0 ${active ? "text-[var(--signal)]" : ""}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
