#!/usr/bin/env node
/**
 * convert-hyperagent-skill.mjs
 *
 * Converts a HyperAgent (Airtable) skill JSON export into a Claude Code
 * `SKILL.md` skill folder.
 *
 * A HyperAgent export is a JSON object with a `data` field containing:
 *   - name          {string}
 *   - description    {string}   (preferred for frontmatter description)
 *   - whenToUse      {string}   (fallback description)
 *   - skillMdBody    {string}   the markdown body
 *   - scripts        {Array<{ filename, content }>}  bundled helper files
 *
 * Usage:
 *   node scripts/convert-hyperagent-skill.mjs <input.json> [outDir]
 *
 *   <input.json>  path to a skill-*.json export
 *   [outDir]      skills root (default: .claude/skills)
 *
 * Writes:
 *   <outDir>/<slug>/SKILL.md
 *   <outDir>/<slug>/<each script.filename>
 *
 * The slug is derived from the JSON `data.name` (or the file name as a
 * fallback), kebab-cased.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

function kebab(input) {
  return String(input)
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

/** Escape a value so it's safe on a single YAML line. */
function yamlString(value) {
  const s = String(value ?? "").replace(/\r?\n/g, " ").trim();
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function convertSkill(inputPath, outRoot) {
  const raw = readFileSync(inputPath, "utf8");
  const parsed = JSON.parse(raw);
  const data = parsed.data ?? parsed;

  const name = data.name ?? basename(inputPath).replace(/\.json$/i, "");
  const description = data.description ?? data.whenToUse ?? "";
  const body = data.skillMdBody ?? "";
  const scripts = Array.isArray(data.scripts) ? data.scripts : [];

  const slug = kebab(name);
  const skillDir = join(outRoot, slug);
  mkdirSync(skillDir, { recursive: true });

  const frontmatter = [
    "---",
    `name: ${yamlString(name)}`,
    `description: ${yamlString(description)}`,
    "---",
    "",
  ].join("\n");

  const skillMd = `${frontmatter}${body.replace(/\r\n/g, "\n").trimEnd()}\n`;
  writeFileSync(join(skillDir, "SKILL.md"), skillMd, "utf8");

  const written = ["SKILL.md"];
  for (const script of scripts) {
    if (!script || !script.filename) continue;
    const target = join(skillDir, script.filename);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, String(script.content ?? ""), "utf8");
    written.push(script.filename);
  }

  return { slug, skillDir, written };
}

// CLI entrypoint
const isMain =
  process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.url.replace(/^file:\/\//, "").replace(/^\/([A-Za-z]:)/, "$1"));

if (isMain) {
  const [, , inputPath, outDir] = process.argv;
  if (!inputPath) {
    console.error(
      "Usage: node scripts/convert-hyperagent-skill.mjs <input.json> [outDir]",
    );
    process.exit(1);
  }
  const outRoot = outDir ?? join(".claude", "skills");
  try {
    const { slug, written } = convertSkill(inputPath, outRoot);
    console.log(`✔ ${slug}: wrote ${written.join(", ")}`);
  } catch (err) {
    console.error(`x failed to convert ${inputPath}:`, err.message);
    process.exit(1);
  }
}
