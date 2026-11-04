import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { createModelValidator } from "../src/data-model.mjs";

const q = name => `"${name.replaceAll('"', '""')}"`;
const literal = value => value === null ? "NULL" : typeof value === "boolean" ? String(value).toUpperCase()
  : typeof value === "number" ? String(value) : `'${value.replaceAll("'", "''")}'`;

export function generateDatabase(schema, data) {
  const lines = ["-- Generated from public/schemas/workspace.schema.json. Do not edit.",
    "-- Synthetic prototype reference, not a production migration or authorization model.", "BEGIN;"];
  const relations = [];
  for (const [table, definition] of Object.entries(schema.$defs)) {
    const columns = [];
    for (const [field, property] of Object.entries(definition.properties)) {
      const type = Array.isArray(property.type) ? property.type.find(t => t !== "null") : property.type;
      const sqlType = property.format === "date" ? "date" : type === "integer" ? "integer" : type === "boolean" ? "boolean" : "text";
      const checks = [];
      if (property.minLength) checks.push(`length(${q(field)}) >= ${property.minLength}`);
      if (property.minimum !== undefined) checks.push(`${q(field)} >= ${property.minimum}`);
      if (property.pattern) checks.push(`${q(field)} ~ ${literal(property.pattern)}`);
      if (property.enum) checks.push(`${q(field)} IN (${property.enum.map(literal).join(", ")})`);
      const nullable = Array.isArray(property.type) && property.type.includes("null");
      columns.push(`  ${q(field)} ${sqlType}${field === "id" ? " PRIMARY KEY" : nullable ? "" : " NOT NULL"}${checks.length ? ` CHECK (${checks.join(" AND ")})` : ""}`);
      if (property["x-references"]) relations.push(`ALTER TABLE ${q(table)} ADD FOREIGN KEY (${q(field)}) REFERENCES ${q(property["x-references"])} ("id") ON DELETE RESTRICT;`);
    }
    for (const fields of definition["x-unique"]) columns.push(`  UNIQUE (${fields.map(q).join(", ")})`);
    if (table === "engagements") columns.push('  CHECK ("analystId" IS NULL OR "qaReviewerId" IS NULL OR "analystId" <> "qaReviewerId")');
    if (table === "users") {
      columns.push('  CHECK (("role" = \'customer\') = ("workspaceId" IS NOT NULL))');
      columns.push('  CHECK (NOT "canQA" OR "role" = \'analyst\')');
    }
    if (table === "documentVersions") columns.push('  CHECK ("page" <= "pageCount")');
    if (table === "evidenceCitations") columns.push('  CHECK ("pageStart" <= "pageEnd")');
    lines.push(`CREATE TABLE ${q(table)} (\n${columns.join(",\n")}\n);`);
  }
  lines.push(...relations, 'CREATE UNIQUE INDEX "users_email_case_insensitive" ON "users" (lower("email"));', "COMMIT;", "");
  const seed = ["-- Generated synthetic data. Apply schema.sql first to a fresh database.", "BEGIN;"];
  for (const table of Object.keys(schema.$defs)) {
    for (const row of data[table]) seed.push(`INSERT INTO ${q(table)} (${Object.keys(row).map(q).join(", ")}) VALUES (${Object.values(row).map(literal).join(", ")});`);
  }
  seed.push("COMMIT;", "");
  return { "schema.sql": lines.join("\n"), "seed.sql": seed.join("\n") };
}

export async function loadModelFiles() {
  const read = async path => JSON.parse(await readFile(new URL(`../public/${path}`, import.meta.url), "utf8"));
  const [schema, data, presentation] = await Promise.all([read("schemas/workspace.schema.json"), read("data/workspace.json"), read("data/presentation.json")]);
  createModelValidator(schema, presentation)(data);
  return { schema, data, presentation };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { schema, data } = await loadModelFiles();
  const outputs = generateDatabase(schema, data);
  const directory = new URL("../database/", import.meta.url);
  if (!process.argv.includes("--check")) await mkdir(directory, { recursive: true });
  for (const [name, content] of Object.entries(outputs)) {
    const file = new URL(name, directory);
    if (process.argv.includes("--check")) {
      if (await readFile(file, "utf8") !== content) throw new Error(`${name} is stale. Run npm run generate:db`);
    } else await writeFile(file, content);
  }
  console.log(`Validated ${Object.keys(schema.$defs).length} collections; database reference ${process.argv.includes("--check") ? "is current" : "generated"}.`);
}
