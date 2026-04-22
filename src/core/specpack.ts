import path from "node:path";
import { z } from "zod";
import { readJsonFile } from "./files.js";

/** Local template from `npx figural-core init` (in_scope / out_of_scope). */
export const LocalSpecpackSchema = z.object({
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

const WebappTestItem = z.object({
  given: z.string(),
  when: z.string(),
  then: z.string()
});

const WebappSuccessItem = z.object({
  metric: z.string(),
  target: z.string(),
  timeframe: z.string()
});

const WebappEdgeCaseObject = z.object({
  scenario: z.string(),
  priority: z.string(),
  handling: z.string()
});

const WebappEvidenceObject = z.object({
  quote: z.string(),
  source: z.string(),
  weight: z.number().optional()
});

/**
 * Figural web app export (scope_in / scope_out, structured tests, etc.).
 * Passes through extra keys (e.g. quality_report, agent_brief).
 */
export const WebappSpecpackSchema = z
  .object({
    decision: z.string(),
    rationale: z.string(),
    confidence: z.number(),
    scope_in: z.array(z.string()).optional(),
    scope_out: z.array(z.string()).optional(),
    tests: z.array(WebappTestItem).optional(),
    success: z.array(WebappSuccessItem).optional(),
    edge_cases: z
      .union([z.array(z.string()), z.array(WebappEdgeCaseObject), z.array(z.unknown())])
      .optional(),
    evidence_refs: z
      .union([z.array(z.string()), z.array(WebappEvidenceObject), z.array(z.unknown())])
      .optional(),
    agent_brief: z.string().optional(),
    product_name: z.string().optional(),
    quality_report: z.unknown().optional(),
    security_abuse: z
      .object({
        summary: z.string().optional(),
        risks: z.array(z.unknown()).optional()
      })
      .optional()
  })
  .passthrough();

export type LocalSpecpack = z.infer<typeof LocalSpecpackSchema>;
export type WebappSpecpack = z.infer<typeof WebappSpecpackSchema>;

/** Single shape used by `readSpecpack`, drift check, and tooling. */
export type NormalizedSpecpack = {
  schema_version: string;
  product_name: string;
  decision: string;
  rationale: string;
  confidence: number;
  in_scope: string[];
  out_of_scope: string[];
  constraints: string[];
  edge_cases: string[];
  acceptance_tests: string[];
  evidence_refs: string[];
  /** Where this file came from (for debugging). */
  source?: "local" | "webapp";
};

/** @deprecated Use LocalSpecpackSchema */
export const SpecpackSchema = LocalSpecpackSchema;

/** @deprecated Use NormalizedSpecpack */
export type Specpack = NormalizedSpecpack;

function isWebappShape(raw: unknown): raw is Record<string, unknown> {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return "scope_in" in o || "scope_out" in o;
}

function stringifyEdgeCaseItem(item: unknown): string {
  if (typeof item === "string") return item;
  if (item && typeof item === "object" && "scenario" in item && "handling" in item) {
    const e = item as { scenario?: string; priority?: string; handling?: string };
    const p = e.priority ?? "?";
    return `[${p}] ${e.scenario ?? ""}: ${e.handling ?? ""}`;
  }
  try {
    return JSON.stringify(item);
  } catch {
    return String(item);
  }
}

function stringifyEvidenceItem(item: unknown): string {
  if (typeof item === "string") return item;
  if (item && typeof item === "object" && "quote" in item && "source" in item) {
    const e = item as { quote?: string; source?: string; weight?: number };
    const base = `${e.quote ?? ""} (${e.source ?? ""})`;
    return e.weight !== undefined ? `${base} [weight=${e.weight}]` : base;
  }
  try {
    return JSON.stringify(item);
  } catch {
    return String(item);
  }
}

function normalizeWebapp(w: WebappSpecpack): NormalizedSpecpack {
  const in_scope = w.scope_in ?? [];
  const out_of_scope = w.scope_out ?? [];

  const rawEdge = w.edge_cases ?? [];
  const edge_cases = Array.isArray(rawEdge)
    ? rawEdge.map(stringifyEdgeCaseItem).filter(Boolean)
    : [];

  const rawEvidence = w.evidence_refs ?? [];
  const evidence_refs = Array.isArray(rawEvidence)
    ? rawEvidence.map(stringifyEvidenceItem).filter(Boolean)
    : [];

  let constraints: string[] = [];
  const maybeConstraints = (w as Record<string, unknown>).constraints;
  if (Array.isArray(maybeConstraints)) {
    constraints = maybeConstraints.filter((x): x is string => typeof x === "string");
  }
  const sec = w.security_abuse;
  if (sec?.summary && typeof sec.summary === "string") {
    constraints.push(`Security/abuse summary: ${sec.summary}`);
  }

  const derivedFromTests =
    Array.isArray(w.tests) && w.tests.length > 0
      ? w.tests.map((t) => `Given ${t.given} When ${t.when} Then ${t.then}`)
      : [];

  const derivedFromSuccess =
    Array.isArray(w.success) && w.success.length > 0
      ? w.success.map((s) => `${s.metric}: ${s.target} (${s.timeframe})`)
      : [];

  const acceptance_tests =
    derivedFromTests.length > 0
      ? derivedFromTests
      : derivedFromSuccess.length > 0
        ? derivedFromSuccess
        : [];

  return {
    schema_version: "webapp-1",
    product_name: typeof w.product_name === "string" ? w.product_name : "",
    decision: w.decision,
    rationale: w.rationale,
    confidence: w.confidence,
    in_scope,
    out_of_scope,
    constraints,
    edge_cases,
    acceptance_tests,
    evidence_refs,
    source: "webapp"
  };
}

function normalizeLocal(l: LocalSpecpack): NormalizedSpecpack {
  return {
    schema_version: l.schema_version,
    product_name: l.product_name,
    decision: l.decision,
    rationale: l.rationale,
    confidence: l.confidence,
    in_scope: l.in_scope,
    out_of_scope: l.out_of_scope,
    constraints: l.constraints,
    edge_cases: l.edge_cases,
    acceptance_tests: l.acceptance_tests,
    evidence_refs: l.evidence_refs,
    source: "local"
  };
}

export function parseAndNormalizeSpecpack(raw: unknown): NormalizedSpecpack {
  if (!raw || typeof raw !== "object") {
    throw new Error(".specpack.json must be a JSON object");
  }

  if (isWebappShape(raw)) {
    const parsed = WebappSpecpackSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Figural webapp specpack invalid: ${parsed.error.message}`);
    }
    return normalizeWebapp(parsed.data);
  }

  const parsed = LocalSpecpackSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Local specpack invalid: ${parsed.error.message}`);
  }
  return normalizeLocal(parsed.data);
}

export async function readSpecpack(opts: { repoRoot: string }): Promise<NormalizedSpecpack> {
  const specPath = path.join(opts.repoRoot, ".specpack.json");
  const raw = await readJsonFile<unknown>(specPath);
  return parseAndNormalizeSpecpack(raw);
}
