import Link from "next/link";
import AdminShell, { PageHeader } from "@/components/admin/AdminShell";
import DashboardStatsPanel from "@/components/admin/DashboardStats";
import { Card, btnPrimary } from "@/components/admin/ui";

const shortcuts = [
  { href: "/orders", title: "Orders", description: "Manage pickups and status.", stat: "Kitchen" },
  { href: "/users", title: "Users", description: "Customer accounts and blocking.", stat: "People" },
  { href: "/products", title: "Products", description: "Browse menu and pricing.", stat: "Catalog" },
  { href: "/stamp-card", title: "Stamp Card", description: "Loyalty stamps and rewards.", stat: "Loyalty" },
  { href: "/spin-prizes", title: "Spin Wheel", description: "Prizes, points, and odds.", stat: "Rewards" },
  { href: "/products/new", title: "Add Product", description: "New menu item with options.", stat: "New" },
];

export default function Home() {
  return (
    <AdminShell>
      <PageHeader
        title="Dashboard"
        description="Business overview — track growth, revenue, and daily activity."
      />

      <DashboardStatsPanel />

      <div className="mt-10">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Quick links
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shortcuts.map((item) => (
            <Link key={item.href} href={item.href} className="group">
              <Card className="h-full p-4 transition hover:border-indigo-200 hover:shadow-sm">
                <span className="text-[10px] font-medium uppercase tracking-wider text-indigo-600">
                  {item.stat}
                </span>
                <h2 className="mt-1.5 text-sm font-semibold text-zinc-900 group-hover:text-indigo-600">
                  {item.title}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  {item.description}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <Card className="mt-8 p-6">
        <h3 className="font-semibold text-zinc-900">Getting started</h3>
        <ol className="mt-4 space-y-3 text-sm text-zinc-600">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
              1
            </span>
            Set up your menu — products, groups, and pricing.
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
              2
            </span>
            Configure loyalty — stamp card and spin wheel prizes.
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
              3
            </span>
            Monitor orders and growth from this dashboard.
          </li>
        </ol>
        <Link href="/products/new" className={`${btnPrimary} mt-6`}>
          Add your first product
        </Link>
      </Card>
    </AdminShell>
  );
}
