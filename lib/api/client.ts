import { apiUrl } from "@/lib/api/config";

async function parseJson<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? "Request failed");
  }
  return json.data as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return fetch(apiUrl(path)).then((res) => parseJson<T>(res));
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((res) => parseJson<T>(res));
}

export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return fetch(apiUrl(path), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((res) => parseJson<T>(res));
}

export function apiDelete<T>(path: string): Promise<T> {
  return fetch(apiUrl(path), { method: "DELETE" }).then((res) =>
    parseJson<T>(res)
  );
}
