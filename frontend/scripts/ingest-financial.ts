import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";
import { prisma } from "../src/lib/prisma";

const DATA_DIR = path.join(process.cwd(), "data");
const FINANCIAL_FILE = path.join(DATA_DIR, "RS_Session_267_AU_1517_A_to_E.iii_.csv");

function cleanStr(s: any) {
  if (typeof s !== "string") return "";
  return s.trim().replace(/\s+/g, " ");
}

function parseNumber(s: any) {
  if (!s) return 0;
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

async function ingestFinancials() {
  console.log("Loading financial impact data from", FINANCIAL_FILE);
  if (!fs.existsSync(FINANCIAL_FILE)) {
    console.error("File not found!");
    return;
  }
  const content = fs.readFileSync(FINANCIAL_FILE, "utf8");
  const records = parse(content, { columns: true, skip_empty_lines: true, relax_quotes: true });

  let inserted = 0;
  for (const row of records as any[]) {
    const stateName = cleanStr(row["State/UT-wise"] || row["State/UT"]);
    if (!stateName || stateName.toLowerCase().includes("total")) continue;
    
    const incidents = parseNumber(row["Total incidents Reported"]);
    const amount = parseNumber(row["Amount Reported (Rs in Lakhs)"]);
    const lien = parseNumber(row["Lien Amount (Rs in Lakhs)"]);
    const refunded = parseNumber(row["Refunded Amount (Rs in Lakhs)"]);

    if (incidents > 0 || amount > 0) {
      await prisma.stateFinancialImpact.upsert({
        where: { state: stateName },
        update: { 
          totalIncidents: incidents,
          amountReported: amount,
          lienAmount: lien,
          refundedAmount: refunded
        },
        create: { 
          state: stateName, 
          totalIncidents: incidents,
          amountReported: amount,
          lienAmount: lien,
          refundedAmount: refunded
        },
      });
      inserted++;
    }
  }
  console.log(`✅ Upserted ${inserted} state financial records.`);
}

async function main() {
  console.log("--- Starting Financial Ingestion Pipeline ---");
  await ingestFinancials();
  console.log("--- Ingestion Complete ---");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
