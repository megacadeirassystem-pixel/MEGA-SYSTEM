import {
  LayoutGrid,
  Tag,
  Filter,
  Package,
  Armchair,
  Layers,
  Truck,
  ShieldCheck,
  BookText,
  Stamp,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const homeItem: NavItem = { href: "/", label: "Comando Central", icon: LayoutGrid };

export const flowItems: NavItem[] = [
  { href: "/cadastros", label: "Cadastros", icon: Tag },
  { href: "/comercial", label: "Comercial", icon: Filter },
  { href: "/compras", label: "Compras", icon: Package },
  { href: "/producao", label: "Produção", icon: Armchair },
  { href: "/estoque", label: "Estoque", icon: Layers },
  { href: "/logistica", label: "Logística", icon: Truck },
  { href: "/posvenda", label: "Pós-venda", icon: ShieldCheck },
];

export const backOfficeItems: NavItem[] = [
  { href: "/financeiro", label: "Financeiro", icon: BookText },
  { href: "/fiscal", label: "Fiscal", icon: Stamp },
  { href: "/rh", label: "RH", icon: Users },
];

export const allNavItems: NavItem[] = [homeItem, ...flowItems, ...backOfficeItems];

export const stationOrder = flowItems.map((i) => i.href);
export const stationLabel: Record<string, string> = Object.fromEntries(
  flowItems.map((i) => [i.href, i.label])
);
