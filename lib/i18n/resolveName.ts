export type AppLang = "da" | "en";

export interface LocalizedName {
  name: string;
  name_da?: string | null;
  name_en?: string | null;
}

export function resolveName(
  entity: LocalizedName,
  lang: AppLang
): string {
  const da = entity.name_da?.trim();
  const en = entity.name_en?.trim();
  const legacy = entity.name?.trim();

  if (lang === "da") {
    return da || en || legacy || "";
  }
  return en || da || legacy || "";
}

export function parseLangParam(value: string | null): AppLang {
  return value === "en" ? "en" : "da";
}
