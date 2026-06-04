import type { AirpDocument } from "@/lib/airp-schema";
import type {
  Artifact,
  RenderBackend,
  RenderContext,
  RenderTarget,
} from "./types";

const backends = new Map<RenderTarget, RenderBackend>();

export function registerBackend(backend: RenderBackend): void {
  backends.set(backend.format, backend);
}

export async function renderDocument(
  doc: AirpDocument,
  target: RenderTarget,
  ctx: RenderContext
): Promise<Artifact> {
  const backend = backends.get(target);
  if (!backend) {
    throw new Error(`No render backend registered for format: ${target}`);
  }
  return backend.render(doc, ctx);
}
