import { parseAirpDocument, type AirpDocument } from "@/lib/airp-schema";

export async function loadDocumentFromFile(file: File): Promise<AirpDocument> {
  const text = await file.text();
  return parseAirpDocument(JSON.parse(text) as unknown);
}
