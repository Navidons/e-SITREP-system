/**
 * Regenerate prisma/data/border-stations.ts from the NCIC weekly statistics workbook.
 * Run: pnpm exec tsx scripts/generate-border-stations-from-weekly.ts
 */
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

const XLSX_PATH = path.join(
  process.cwd(),
  "instructions/support-files/WEEKLY STATISTICS 02.08 MAY 2026.xlsx",
);
const OUT_PATH = path.join(process.cwd(), "prisma/data/border-stations.ts");

type StationType = "Air" | "Land" | "Water";

/** Stable codes aligned with NCIC weekly matrix (S/N order). */
const CODE_BY_EXCEL_NAME: Record<string, string> = {
  Entebbe: "ENT",
  Busia: "BUS",
  Lwakhakha: "LWA",
  Malaba: "MAL",
  "Suam River": "SUA",
  Elegu: "ELE",
  "Madi Opei": "MAD",
  Mpondwe: "MPO",
  Ishasha: "ISH",
  Kayanja: "KYN",
  "Mirama Hills": "MIR",
  Kikagati: "KIK",
  Bugango: "BUG",
  Kizinga: "KIZ",
  Vurra: "VUR",
  Odramachako: "ODR",
  Airfield: "AIR",
  Lia: "LIA",
  Katuna: "KAT",
  Kamwezi: "KMW",
  Cyanika: "CYA",
  Bunagana: "BNG",
  Butogota: "BUT",
  Busanza: "BSZ",
  Mutukula: "MUT",
  Kansensero: "KAN",
  Ngomoromo: "NGO",
  Waligo: "WAL",
  "Aweno-Olwiyo": "AWO",
  Oraba: "ORA",
  Afogi: "AFO",
  Goli: "GOL",
  Dei: "DEI",
  Paidha: "PAI",
  Padea: "PAD",
  Ntoroko: "NTO",
  Busunga: "BSN",
  Rwebisengo: "RWE",
  Butiaba: "BTB",
  Wanseko: "WAN",
  Sebagoro: "SEB",
  "Kaiso-Tonya": "KAI",
  Ndaiga: "NDA",
  Nsonga: "NSO",
  Portbell: "PBL",
  Opotpot: "OPO",
  Kamion: "KMN",
  "Moroto Airstrip": "MRT",
  Amudat: "AMU",
  Nakabaat: "NAK",
  "Kidepo Airstrip": "KDP",
  "Kimaka Airstrip": "KMK",
  "Kakira Airstrip": "KAK",
  "Lolwe Island": "LOL",
  "Singulu Island": "SIG",
  "Jinja port": "JIN",
};

function stationType(excelName: string): StationType {
  const n = excelName.toLowerCase();
  if (n === "entebbe" || n.includes("airstrip") || n === "airfield") return "Air";
  if (n.includes("island") || n.includes("port")) return "Water";
  return "Land";
}

function clusterFor(order: number, excelName: string): string {
  const n = excelName.toLowerCase();
  if (n === "entebbe" || n === "portbell" || n === "airfield" || n.includes("kimaka"))
    return "Kampala";
  if (order <= 5 || n === "jinja port") return "Eastern";
  if (
    [
      "elegu",
      "madi opei",
      "ngomoromo",
      "waligo",
      "aweno-olwiyo",
      "oraba",
      "afogi",
      "goli",
      "dei",
      "amudat",
      "nakabaat",
      "moroto airstrip",
      "kidepo airstrip",
      "opotpot",
      "kamion",
    ].some((x) => n === x || n.includes(x))
  )
    return "Northern";
  if (
    [
      "mpondwe",
      "vurra",
      "odramachako",
      "lia",
      "paidha",
      "padea",
      "ntoroko",
      "busunga",
      "rwebisengo",
      "butiaba",
      "wanseko",
      "sebagoro",
      "kaiso-tonya",
      "ndaiga",
      "nsonga",
    ].some((x) => n === x)
  )
    return "Western";
  if (
    [
      "ishasha",
      "kayanja",
      "mirama hills",
      "kikagati",
      "bugango",
      "kizinga",
      "katuna",
      "kamwezi",
      "cyanika",
      "bunagana",
      "butogota",
      "busanza",
    ].some((x) => n === x)
  )
    return "South-Western";
  if (n === "mutukula" || n === "kansensero" || n.includes("lolwe") || n.includes("singulu"))
    return "Southern";
  return "Eastern";
}

function toDbName(excelName: string): string {
  return excelName.toUpperCase();
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX_PATH);
  const sheet = wb.worksheets[0];
  const rows: { order: number; excelName: string }[] = [];

  sheet.eachRow((row, rowNum) => {
    if (rowNum < 3) return;
    const excelName =
      row.getCell(2).text?.trim() ||
      String(row.getCell(2).value ?? "").trim();
    if (!excelName || /grand total/i.test(excelName)) return;
    const order = Number(row.getCell(1).value) || rows.length + 1;
    rows.push({ order, excelName });
  });

  const missing = rows.filter((r) => !CODE_BY_EXCEL_NAME[r.excelName]);
  if (missing.length > 0) {
    throw new Error(
      `Missing codes for: ${missing.map((m) => m.excelName).join(", ")}`,
    );
  }

  const stations = rows.map((r) => {
    const code = CODE_BY_EXCEL_NAME[r.excelName]!;
    return {
      code,
      name: toDbName(r.excelName),
      excelName: r.excelName,
      cluster: clusterFor(r.order, r.excelName),
      type: stationType(r.excelName),
      displayOrder: r.order,
    };
  });

  const lines = stations.map(
    (s) =>
      `  { code: "${s.code}", name: "${s.name}", cluster: "${s.cluster}", type: "${s.type}", displayOrder: ${s.displayOrder} }, // ${s.excelName}`,
  );

  const content = `/** Uganda NCIC entry/exit points — from WEEKLY STATISTICS 02.08 MAY 2026.xlsx (S/N order). */
export type BorderStationSeed = {
  code: string;
  name: string;
  cluster: string;
  type: "Air" | "Land" | "Water";
  /** Row order in NCIC weekly matrix (column "Entry/ Exit Points."). */
  displayOrder: number;
};

export const BORDER_STATIONS: BorderStationSeed[] = [
${lines.join("\n")}
];

export function stationInputterUsername(name: string): string {
  return \`\${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.inputter\`;
}
`;

  fs.writeFileSync(OUT_PATH, content, "utf8");
  console.log(`Wrote ${stations.length} stations to ${OUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
