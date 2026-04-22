import path from "node:path";
import { z } from "zod";
import { readJsonFile } from "./files.js";

export const SpecpackSchema = z.object({
  schema_version: z.string(),
  product_name: z.string(),
  decision: z.string(),
  rationale: z.string(),
  confidence: z.number(),
  in_scope: z.array(z.string()),
  out_of_scope: z.array(z.string()),
  constraints: z.array(z.string()),
  edge_cases: z.array(z.string()),
  acceptance_tests: z.array(z.string()),
  evidence_refs: z.array(z.string())
});

export type Specpack = z.infer<typeof SpecpackSchema>;

export async function readSpecpack(opts: { repoRoot: string }): Promise<Specpack> {
  const specPath = path.join(opts.repoRoot, ".specpack.json");
  const raw = await readJsonFile<unknown>(specPath);
  return SpecpackSchema.parse(raw);
}

