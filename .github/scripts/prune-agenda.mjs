import { readFile, writeFile } from "node:fs/promises";

const contentPath = new URL("../../content.json", import.meta.url);
const today = process.env.PRUNE_AS_OF || new Date().toISOString().slice(0, 10);
const dryRun = process.argv.includes("--dry-run");

if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
  throw new Error("PRUNE_AS_OF must use YYYY-MM-DD format.");
}

const cutoff = new Date(`${today}T00:00:00.000Z`);
cutoff.setUTCDate(cutoff.getUTCDate() - 7);
const cutoffDate = cutoff.toISOString().slice(0, 10);

const content = JSON.parse(await readFile(contentPath, "utf8"));
const agenda = content.agenda;

if (!agenda || typeof agenda !== "object") {
  throw new Error("The agenda section is missing from content.json.");
}

function pruneList(owner, key, label, dateForItem = (item) => item?.datum) {
  if (!Array.isArray(owner?.[key])) return 0;

  const original = owner[key];
  owner[key] = original.filter((item) => {
    const date = dateForItem(item);
    return typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date >= cutoffDate;
  });

  const removed = original.length - owner[key].length;
  if (removed > 0) console.log(`${label}: removed ${removed} expired item(s).`);
  return removed;
}

function maandEinde(item) {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(item?.maand || "");
  if (!match) return null;

  const jaar = Number(match[1]);
  const maand = Number(match[2]);
  if (maand < 1 || maand > 12) return null;
  return new Date(Date.UTC(jaar, maand, 0)).toISOString().slice(0, 10);
}

const removed =
  pruneList(agenda, "losse_activiteiten", "Losse activiteiten") +
  pruneList(agenda.gezonde_ontmoeting, "maanden", "Gezonde Ontmoeting maandblokken", maandEinde) +
  pruneList(agenda.diabetes_spreekuur, "maanden", "Diabetes spreekuur maandblokken", maandEinde) +
  pruneList(agenda.gezonde_ontmoeting, "sessies", "Oude Gezonde Ontmoeting-sessies") +
  pruneList(agenda, "afwijkingen", "Eenmalige wijzigingen", (item) => item?.nieuwe_datum || item?.datum);

if (removed === 0) {
  console.log(`No agenda items to remove (cutoff: ${cutoffDate}).`);
} else if (dryRun) {
  console.log(`Dry run: ${removed} item(s) would be removed.`);
} else {
  await writeFile(contentPath, `${JSON.stringify(content, null, 2)}\n`);
}