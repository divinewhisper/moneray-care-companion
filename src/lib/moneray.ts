export type Category = "body" | "mind";
export type Mode = "diagnose" | "followup";

export const categoryLabel: Record<Category, string> = {
  body: "สุขภาพกาย",
  mind: "สุขภาพจิต",
};

export const modeLabel: Record<Mode, string> = {
  diagnose: "วินิจฉัยโรค",
  followup: "ติดตามอาการหลังการรักษา",
};

export const zoneClass: Record<string, string> = {
  "body-diagnose": "zone-body-diagnose",
  "body-followup": "zone-body-followup",
  "mind-diagnose": "zone-mind-diagnose",
  "mind-followup": "zone-mind-followup",
};

export function isCategory(v: string): v is Category {
  return v === "body" || v === "mind";
}
export function isMode(v: string): v is Mode {
  return v === "diagnose" || v === "followup";
}

export function zoneFor(category: string, mode: string) {
  return zoneClass[`${category}-${mode}`] ?? "";
}

export const thaiDateTime = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const thaiDate = (iso: string) =>
  new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
