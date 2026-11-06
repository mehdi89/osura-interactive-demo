export const APPEARANCE_KEY = "osura-appearance";

export function readAppearance(storage) {
  try {
    const value = (storage || globalThis.localStorage)?.getItem(APPEARANCE_KEY);
    return ["light", "dark", "system"].includes(value) ? value : "system";
  } catch {
    return "system";
  }
}

export function resolveTheme(appearance, systemDark) {
  return appearance === "dark" || (appearance === "system" && systemDark) ? "dark" : "light";
}
