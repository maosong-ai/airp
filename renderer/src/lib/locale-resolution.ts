import { detectSystemLocale } from "@/lib/i18n";
import { matchLocaleInList } from "@/lib/locale-match";

type BaseInput = {
  rendererLocales: readonly string[];
  rendererDefaultLocale: string;
  storedUiLocale?: string | null;
  browserLocales?: readonly string[];
};

type EmptyInput = BaseInput & {
  mode: "dashboard-empty";
  preferredLocale?: string | null;
};

type DocInput = BaseInput & {
  mode: "dashboard-doc" | "html-all";
  docLocales: readonly string[];
  docDefaultLocale: string;
  preferredLocale?: string | null;
};

type SingleInput = BaseInput & {
  mode: "html-single";
  singleLocale: string;
};

export type LocaleResolutionInput = EmptyInput | DocInput | SingleInput;

export type LocaleResolutionOutput = {
  availableLocales: readonly string[];
  contentLocale: string;
  uiLocale: string;
  shouldPersistUiLocale: boolean;
};

function getBrowserLocaleCandidates(input: BaseInput): readonly string[] {
  if (input.browserLocales && input.browserLocales.length > 0) {
    return input.browserLocales;
  }
  return [detectSystemLocale()];
}

function resolveUiFromRendererChain(
  input: BaseInput,
  preferredLocale?: string | null
): string {
  const browserLocales = getBrowserLocaleCandidates(input);
  const candidates = [preferredLocale, input.storedUiLocale, ...browserLocales, input.rendererDefaultLocale]
    .filter(Boolean) as string[];

  for (const candidate of candidates) {
    const matched = matchLocaleInList(candidate, input.rendererLocales);
    if (matched) {
      return matched;
    }
  }

  return input.rendererDefaultLocale;
}

export function resolveLocales(input: LocaleResolutionInput): LocaleResolutionOutput {
  if (input.mode === "dashboard-empty") {
    const uiLocale = resolveUiFromRendererChain(input, input.preferredLocale);
    return {
      availableLocales: input.rendererLocales,
      contentLocale: uiLocale,
      uiLocale,
      shouldPersistUiLocale: true,
    };
  }

  if (input.mode === "html-single") {
    const browserLocales = getBrowserLocaleCandidates(input);
    const uiLocale =
      matchLocaleInList(input.singleLocale, input.rendererLocales) ??
      browserLocales
        .map((candidate) => matchLocaleInList(candidate, input.rendererLocales))
        .find(Boolean) ??
      input.rendererDefaultLocale;

    return {
      availableLocales: [input.singleLocale],
      contentLocale: input.singleLocale,
      uiLocale,
      // single mode strictly does not read/write language storage
      shouldPersistUiLocale: false,
    };
  }

  const browserLocales = getBrowserLocaleCandidates(input);
  const contentCandidates = [input.preferredLocale, input.storedUiLocale, ...browserLocales, input.docDefaultLocale]
    .filter(Boolean) as string[];

  let contentLocale = input.docDefaultLocale;
  for (const candidate of contentCandidates) {
    const matched = matchLocaleInList(candidate, input.docLocales);
    if (matched) {
      contentLocale = matched;
      break;
    }
  }

  const uiLocale =
    matchLocaleInList(contentLocale, input.rendererLocales) ??
    resolveUiFromRendererChain(input);

  return {
    availableLocales: input.docLocales,
    contentLocale,
    uiLocale,
    shouldPersistUiLocale: true,
  };
}

export function resolveRendererUiLocaleForSsr(
  contentLocale: string,
  rendererLocales: readonly string[],
  rendererDefaultLocale: string
): string {
  return (
    matchLocaleInList(contentLocale, rendererLocales) ??
    rendererDefaultLocale
  );
}
