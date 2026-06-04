import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function vendorRendererPublic({ repoRoot, dstSkillRoot }) {
  const srcPublic = path.join(repoRoot, "renderer", "public");
  const dstPublic = path.join(dstSkillRoot, "assets", "renderer", "public");
  await mkdir(path.dirname(dstPublic), { recursive: true });
  await cp(srcPublic, dstPublic, { recursive: true });
  return { srcPublic, dstPublic };
}

async function vendorSchema({ repoRoot, dstSkillRoot }) {
  const srcSchema = path.join(repoRoot, "airp-document.schema.json");
  const dstSchema = path.join(dstSkillRoot, "schemas", "airp-document.schema.json");
  await mkdir(path.dirname(dstSchema), { recursive: true });
  await cp(srcSchema, dstSchema);
  return { srcSchema, dstSchema };
}

async function main() {
  const repoRoot = path.resolve(__dirname, "..");
  const airpRoot = path.join(repoRoot, "skills", "airp");
  const airpHtmlRoot = path.join(repoRoot, "skills", "airp-html");
  const airpDashboardRoot = path.join(repoRoot, "skills", "airp-dashboard");

  const schema = await vendorSchema({ repoRoot, dstSkillRoot: airpRoot });

  const publicHtml = await vendorRendererPublic({ repoRoot, dstSkillRoot: airpHtmlRoot });

  const srcDist = path.join(repoRoot, "renderer", "dist");
  const dstDashDist = path.join(airpDashboardRoot, "renderer-dist");
  await mkdir(path.dirname(dstDashDist), { recursive: true });
  await cp(srcDist, dstDashDist, { recursive: true });

  console.log(
    [
      "Vendored AIRP assets:",
      `  schema:  ${schema.srcSchema} -> ${schema.dstSchema}`,
      `  html:    public ${publicHtml.srcPublic} -> ${publicHtml.dstPublic}`,
      `  dash:    dist ${srcDist} -> ${dstDashDist}`,
    ].join("\n")
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack : err);
  process.exit(1);
});

