import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";

export async function makeTempDir(prefix = "airp-test-"): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function cleanupTempDir(tempDir: string): Promise<void> {
  await rm(tempDir, { recursive: true, force: true });
}