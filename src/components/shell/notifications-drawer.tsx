"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const notifications = [
  { title: "Gargalo em Produção", desc: "OF-0409 bloqueada aguardando chapa MDF 15mm", time: "agora", read: false },
  { title: "Novo lead", desc: "Hotel Transamérica Ibirapuera entrou no funil", time: "2h atrás", read: false },
  { title: "Pedido aprovado", desc: "MC-0846 — Igreja Batista Central", time: "ontem", read: true },
];

export function NotificationsDrawer() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="relative rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
        <Bell className="size-4.5" />
        <span className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-[var(--brand)]" />
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Notificações</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col overflow-y-auto">
          {notifications.map((n, i) => (
            <div key={i} className="flex gap-2.5 border-t px-4 py-3 first:border-t-0">
              <span
                className="mt-1.5 size-1.5 shrink-0 rounded-full"
                style={{ background: n.read ? "var(--border)" : "var(--signal)" }}
              />
              <div className="min-w-0">
                <div className="text-xs font-semibold">{n.title}</div>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">{n.desc}</p>
                <span className="mt-1 block text-[10px] text-muted-foreground">{n.time}</span>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
