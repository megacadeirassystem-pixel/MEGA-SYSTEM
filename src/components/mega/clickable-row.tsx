"use client";

import { useRouter } from "next/navigation";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** <Link> não pode envolver um <TableRow> — <a> não pode conter <tr>, é HTML inválido e quebra a
 * hidratação (o navegador reorganiza a árvore sozinho, e o clique para de navegar de verdade).
 * Isso faz a mesma coisa sem essa armadilha. */
export function ClickableRow({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <TableRow
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(href);
      }}
      tabIndex={0}
      className={cn("cursor-pointer", className)}
    >
      {children}
    </TableRow>
  );
}
