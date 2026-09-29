import type { ColorSchemePref } from "./color-scheme";

export type ToastKind = "failed" | "succeeded";

export type ExportFormat = "html" | "markdown";

/** Host → webview */
export type HostToWebviewMessage =
  | { kind: ToastKind; type: "toast" }
  | { type: "colorScheme"; value: ColorSchemePref };

/** Webview → host */
export type WebviewToHostMessage =
  | { type: "ready" }
  | { type: "editSource" }
  | { type: "export"; format: ExportFormat }
  | { type: "openOutput" }
  | { type: "placeholderReady" };
