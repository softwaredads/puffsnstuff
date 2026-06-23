"use client";

import { AdminLanguageProvider } from "@/context/AdminLanguageContext";

export default function AdminProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLanguageProvider>{children}</AdminLanguageProvider>;
}
