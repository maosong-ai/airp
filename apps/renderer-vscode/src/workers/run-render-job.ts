import path from "node:path";
import { type AirpResult, airpResultFrom, withStage } from "@airp/diagnostics";
import { loadDocumentFile } from "@airp/loader/node";
import type { AirpDocumentSnapshot } from "@airp/renderer";
import { renderDocument } from "@airp/renderer/node/render";
import { validateDocument } from "@airp/validate";
import { documentTitleFromLoaded } from "../document-title.js";
import type { RenderJobRecipe } from "./ipc.js";

export interface RunRenderJobValue {
  body: string;
  /** Resolved `meta.title` for host chrome (panel tab). */
  documentTitle: string;
}

export type RunRenderJobResult = AirpResult<RunRenderJobValue>;

type FailResult = Extract<RunRenderJobResult, { ok: false }>;

function primaryBody(
  files: readonly { body: string | Uint8Array; path: string }[]
): string {
  const primary = files[0];
  if (!primary) {
    return "";
  }
  return typeof primary.body === "string"
    ? primary.body
    : new TextDecoder().decode(primary.body);
}

/** Load → validate → render; return primary body (no disk write). */
export async function runRenderJob(
  recipe: RenderJobRecipe
): Promise<RunRenderJobResult> {
  const inputFile = path.resolve(recipe.input);

  const loadResult = await loadDocumentFile(inputFile);
  if (!loadResult.ok) {
    return airpResultFrom(
      withStage(loadResult.diagnostics, "bootstrap")
    ) as FailResult;
  }

  const validation = await validateDocument(loadResult.value.document);
  if (!validation.ok) {
    return airpResultFrom(validation.diagnostics) as FailResult;
  }

  const renderResult = await renderDocument(
    loadResult.value.document as unknown as AirpDocumentSnapshot,
    recipe.target,
    {
      ...(recipe.targetOptions ? { targetOptions: recipe.targetOptions } : {}),
    }
  );
  if (!renderResult.ok) {
    return airpResultFrom(renderResult.diagnostics) as FailResult;
  }

  return airpResultFrom(
    [...validation.diagnostics, ...renderResult.diagnostics],
    {
      body: primaryBody(renderResult.value.files),
      documentTitle: documentTitleFromLoaded(
        loadResult.value.document,
        "AIRP Renderer"
      ),
    }
  );
}
