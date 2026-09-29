import type { AirpResult } from "@airp/diagnostics";
import type {
  AirpDocumentSnapshot,
  RenderContext,
  RenderOutput,
} from "@airp/renderer-contract";
import { renderDocumentWithCatalog } from "../pipeline/render-document-with-catalog.js";
import { rendererTargetCatalog } from "./catalog.js";

// biome-ignore lint/performance/noBarrelFile: Node render entry exposes the HTML target warm-up
export { warmUpHtmlRenderer as warmUpRenderer } from "@airp/renderer-target-html/node";

/**
 * Node render entry: HTML uses Mermaid→SVG via renderer-target-html/node.
 * Imported via `@airp/renderer/node/render` (not the `/node` hot-reload barrel).
 */
export function renderDocument(
  document: AirpDocumentSnapshot,
  target: string,
  input: RenderContext
): Promise<AirpResult<RenderOutput>> {
  return renderDocumentWithCatalog(
    document,
    target,
    input,
    rendererTargetCatalog
  );
}
