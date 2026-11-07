"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronLeft, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { homeItem, flowItems, backOfficeItems, type NavItem } from "@/lib/nav";

function NavLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        active && "bg-[var(--signal-dim)] text-foreground",
        collapsed && "justify-center px-2"
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active-pill"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
          className="absolute -left-2.5 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-[var(--signal)]"
        />
      )}
      <Icon className={cn("size-4 shrink-0", active && "text-[var(--signal)]")} />
      {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem("megasystem_rail_collapsed");
      if (stored === "1") setCollapsed(true);
    } catch {}
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("megasystem_rail_collapsed", next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  const dark = mounted && resolvedTheme === "dark";

  return (
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col border-r bg-sidebar transition-[width] duration-200",
        collapsed ? "w-16" : "w-[230px]"
      )}
    >
      <div className={cn("flex items-center gap-2.5 border-b px-3.5 py-4", collapsed && "justify-center")}>
        <button
          onClick={toggleCollapsed}
          className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[#1A0D06] p-1 ring-1 ring-(--brand)/30"
          title="Recolher"
        >
          <Image src="/logo-nova-mega-white.png" alt="Nova Mega" width={22} height={18} className="object-contain" />
        </button>
        {!collapsed && (
          <>
            <div className="text-sm font-bold tracking-tight">
              MEGA <span className="font-medium text-muted-foreground">SYSTEM</span>
            </div>
            <button
              onClick={toggleCollapsed}
              className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <ChevronLeft className="size-3.5" />
            </button>
          </>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        <NavLink item={homeItem} active={pathname === "/"} collapsed={collapsed} />

        {!collapsed && (
          <div className="mt-3.5 mb-1.5 px-2.5 text-[10px] font-semibold tracking-wider text-muted-foreground">
            OPERAÇÃO
          </div>
        )}
        <div className={cn("flex flex-col gap-0.5", collapsed && "mt-2")}>
          {flowItems.map((item) => (
            <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} collapsed={collapsed} />
          ))}
        </div>

        {!collapsed && (
          <div className="mt-3.5 mb-1.5 px-2.5 text-[10px] font-semibold tracking-wider text-muted-foreground">
            RETAGUARDA
          </div>
        )}
        <div className={cn("flex flex-col gap-0.5", collapsed && "mt-2")}>
          {backOfficeItems.map((item) => (
            <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} collapsed={collapsed} />
          ))}
        </div>
      </nav>

      <div className="flex flex-col gap-0.5 border-t px-2.5 py-2.5">
        <button
          onClick={() => setTheme(dark ? "light" : "dark")}
          className={cn(
            "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground",
            collapsed && "justify-center px-2"
          )}
        >
          {mounted && dark ? <Moon className="size-4" /> : <Sun className="size-4" />}
          {!collapsed && <span>{mounted && dark ? "Modo escuro" : "Modo claro"}</span>}
        </button>
        <div className={cn("flex items-center gap-2.5 rounded-md px-2.5 py-1.5", collapsed && "justify-center px-2")}>
          <div className="flex size-6.5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand)] to-orange-300 text-[11px] font-semibold text-[#1A0D06]">
            E
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold">Elton</div>
              <div className="truncate text-[10.5px] text-muted-foreground">GB Company</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
