import { apiUrl } from "@/lib/api/config";

export async function uploadSpinIcon(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "spin-icons");

  const res = await fetch(apiUrl("/api/upload"), {
    method: "POST",
    body: formData,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Icon upload failed");

  return json.data.url as string;
}
