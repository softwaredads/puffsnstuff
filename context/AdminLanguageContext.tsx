"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { da } from "@/lib/i18n/da";
import { en, type AdminDict } from "@/lib/i18n/en";

export type AdminLang = "en" | "da";

const STORAGE_KEY = "puffnstuff-admin-lang";

interface AdminLanguageContextValue {
  lang: AdminLang;
  setLang: (lang: AdminLang) => void;
  t: AdminDict;
}

const AdminLanguageContext = createContext<AdminLanguageContextValue | null>(
  null
);

export function AdminLanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<AdminLang>("en");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "da" || stored === "en") {
      setLangState(stored);
    }
  }, []);

  const setLang = useCallback((next: AdminLang) => {
    setLangState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = useMemo(() => (lang === "da" ? da : en), [lang]);

  const value = useMemo(
    () => ({ lang, setLang, t }),
    [lang, setLang, t]
  );

  return (
    <AdminLanguageContext.Provider value={value}>
      {children}
    </AdminLanguageContext.Provider>
  );
}

export function useAdminLanguage() {
  const ctx = useContext(AdminLanguageContext);
  if (!ctx) {
    throw new Error("useAdminLanguage must be used within AdminLanguageProvider");
  }
  return ctx;
}
