import { expect } from "vitest";
import {
  extractAirpChrome,
  parseChromeConfig,
  stripScripts,
} from "./html-markup";

export function assertSingleLocaleHtml(
  html: string,
  options: { locale: string; title: string }
): void {
  const { locale, title } = options;

  expect(html).toContain(title);

  const chrome = extractAirpChrome(html);
  expect(chrome).not.toContain('data-airp-control="locale"');
  expect(chrome).not.toContain("data-airp-locale-option=");
  expect(chrome).not.toContain('data-airp-locale-trigger="true"');

  expect(stripScripts(html)).not.toMatch(/data-airp-locale="/);

  const config = parseChromeConfig(html);
  expect(config.localeMode).toBe("single");
  expect(config.exportLocale).toBe(locale);
}
