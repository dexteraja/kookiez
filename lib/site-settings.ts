export type AvailabilityState = "available" | "limited" | "closed";

export interface SiteSettings {
  availability: AvailabilityState;
  note: string;
}

const STORAGE_KEY = "kookiez_site_settings";
export const SITE_SETTINGS_UPDATED_EVENT = "kookiez:site-settings-updated";

const defaults: SiteSettings = {
  availability: "available",
  note: "Menerima proyek baru minggu ini.",
};

export function getSiteSettings(): SiteSettings {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaults, ...(JSON.parse(raw) as Partial<SiteSettings>) } : defaults;
  } catch {
    return defaults;
  }
}

export function saveSiteSettings(settings: SiteSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event(SITE_SETTINGS_UPDATED_EVENT));
}
