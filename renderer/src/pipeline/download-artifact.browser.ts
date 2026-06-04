import type { Artifact } from "./types";

export function downloadArtifact(artifact: Artifact): void {
  const blob = new Blob([artifact.body], { type: artifact.mimeType });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = artifact.filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
