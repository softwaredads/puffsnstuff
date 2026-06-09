import Link from "next/link";
import AdminShell, { PageHeader } from "@/components/admin/AdminShell";
import { Card, btnPrimary } from "@/components/admin/ui";

const shortcuts = [
  {
    href: "/products/new",
    title: "Add Product",
    description: "Create a menu item with customizations and pricing.",
    stat: "New",
  },
  {
    href: "/products",
    title: "View Products",
    description: "Browse all products, groups, and option pricing.",
    stat: "Catalog",
  },
  {
    href: "/groups/new",
    title: "Create Group Template",
    description: "Build reusable option groups for multiple products.",
    stat: "Templates",
  },
  {
    href: "/groups",
    title: "Group Templates",
    description: "Manage shared sizes, toppings, and add-on sets.",
    stat: "Library",
  },
];

export default function Home() {
  return (
    <AdminShell>
      <PageHeader
        title="Dashboard"
        description="Overview of your menu management workspace."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {shortcuts.map((item) => (
          <Link key={item.href} href={item.href} className="group">
            <Card className="h-full p-5 transition hover:border-indigo-200 hover:shadow-md">
              <span className="text-xs font-medium uppercase tracking-wider text-indigo-600">
                {item.stat}
              </span>
              <h2 className="mt-3 font-semibold text-zinc-900 group-hover:text-indigo-600">
                {item.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                {item.description}
              </p>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-8 p-6">
        <h3 className="font-semibold text-zinc-900">Quick workflow</h3>
        <ol className="mt-4 space-y-3 text-sm text-zinc-600">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">1</span>
            Create group templates for shared options (toppings, sizes).
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">2</span>
            Add products and attach templates or product-only groups.
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">3</span>
            Review the catalog — data is available via API for your app.
          </li>
        </ol>
        <Link href="/products/new" className={`${btnPrimary} mt-6`}>
          Get started
        </Link>
      </Card>
    </AdminShell>
  );
}
