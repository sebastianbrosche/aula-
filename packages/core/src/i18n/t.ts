import type { Locale } from "../actor.ts";
import en from "./en.json";
import pt from "./pt-PT.json";

const catalogs = {
  en,
  "pt-PT": pt,
} as const;

export type MessageKey = keyof typeof en;

export function t(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string>,
): string {
  const table = catalogs[locale];
  let value = table[key] ?? catalogs.en[key] ?? key;
  if (vars) {
    for (const [name, replacement] of Object.entries(vars)) {
      value = value.replaceAll(`{${name}}`, replacement);
    }
  }
  return value;
}

export function catalogKeys(): string[] {
  return Object.keys(en);
}

export function ptKeys(): string[] {
  return Object.keys(pt);
}
