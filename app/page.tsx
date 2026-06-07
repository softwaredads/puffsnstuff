"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  useEffect(() => {
    async function checkConnection() {
      const { error } = await supabase.auth.getSession();

      if (error) {
        console.error("Supabase connection failed:", error.message);
      } else {
        console.log("Supabase connected!");
      }
    }

    checkConnection();
  }, []);

  return (
    <div className="flex flex-1 items-center justify-center">
      <h1 className="text-2xl font-semibold">Puffs n Stuff Admin</h1>
    </div>
  );
}
