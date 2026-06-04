import type { ThemeMode } from "@/config/renderer-config";
import type { AirpDocument } from "@/lib/airp-schema";
import type { ThemePreset } from "@/lib/themes";

export type RenderTarget = "html" | "markdown";

export type Artifact = {
  format: RenderTarget;
  mimeType: string;
  filename: string;
  body: string;
};

export type RenderContext = {
  locale: string;
  themePreset?: ThemePreset;
  colorMode?: ThemeMode;
  /** HTML export mode: all = multi-locale switcher, single = one locale only (HTML only) */
  localeMode?: "all" | "single";
  /** Node-only: renderer root for reading vendored dist/public assets */
  rendererRoot?: string;
};

/** Markdown render context: only locale is consumed */
export type MarkdownRenderContext = {
  locale: string;
  rendererRoot?: string;
};

/** HTML render context: discriminated union of all-mode vs single-mode */
export type HtmlRenderContext =
  | {
      mode: "all";
      themePreset?: ThemePreset;
      colorMode?: ThemeMode;
      interactive?: boolean;
      rendererRoot?: string;
    }
  | {
      mode: "single";
      singleLocale: string;
      themePreset?: ThemePreset;
      colorMode?: ThemeMode;
      rendererRoot?: string;
    };

export interface RenderBackend {
  readonly format: RenderTarget;
  render(doc: AirpDocument, ctx: RenderContext): Promise<Artifact>;
}
