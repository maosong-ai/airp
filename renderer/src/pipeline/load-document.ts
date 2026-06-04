import { readFile } from "node:fs/promises";
import { parseAirpDocument, type AirpDocument } from "@/lib/airp-schema";

export async function loadDocumentFromPath(
  filePath: string
): Promise<AirpDocument> {
  const raw = await readFile(filePath, "utf-8");
  return parseAirpDocument(JSON.parse(raw) as unknown);
}
