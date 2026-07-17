import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";
import { prisma } from "../src/lib/prisma";

import { State, City } from "country-state-city";

const DATA_DIR = path.join(process.cwd(), "data");
const STATES_FILE = path.join(DATA_DIR, "NCRB_CII_2023_Table_9A.1_0.csv");
const CITIES_FILE = path.join(DATA_DIR, "NCRB_CII_2023_Table_9B.1_0.csv");
const DISTRICTS_FILE = path.join(DATA_DIR, "NCRB_District_Table_1.9.csv");

function cleanStr(s: any) {
  if (typeof s !== "string") return "";
  return s.trim().replace(/\s+/g, " ");
}

function parseNumber(s: any) {
  if (!s) return 0;
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

async function ingestStates() {
  console.log("Loading states from", STATES_FILE);
  if (!fs.existsSync(STATES_FILE)) return;
  const content = fs.readFileSync(STATES_FILE, "utf8");
  const records = parse(content, { columns: true, skip_empty_lines: true, relax_quotes: true });

  let inserted = 0;
  for (const row of records as any[]) {
    const stateName = cleanStr(row["State/UT"]);
    if (!stateName || stateName.toLowerCase().includes("total")) continue;
    
    const count2021 = parseNumber(row["2021"]);
    const count2022 = parseNumber(row["2022"]);
    const count2023 = parseNumber(row["2023"]);
    const rate = parseNumber(row["Rate of Total Cyber Crimes (2023)"]);
    const chargeSheetRate = parseNumber(row["Chargesheeting Rate (2023)"]);

    const metadata = {
      cases2021: count2021,
      cases2022: count2022,
      cases2023: count2023,
      crimeRate: rate,
      chargeSheetRate: chargeSheetRate
    };

    if (count2023 > 0) {
      await prisma.governmentStateCybercrime.upsert({
        where: { state: stateName },
        update: { crimeCount: count2023, metadata },
        create: { state: stateName, year: 2023, crimeCount: count2023, metadata },
      });
      inserted++;
    }
  }
  console.log(`✅ Upserted ${inserted} states.`);
}

async function ingestCities() {
  console.log("Loading cities from", CITIES_FILE);
  if (!fs.existsSync(CITIES_FILE)) return;
  const content = fs.readFileSync(CITIES_FILE, "utf8");
  const records = parse(content, { columns: true, skip_empty_lines: true, relax_quotes: true });

  let inserted = 0;
  for (const row of records as any[]) {
    let rawCity = cleanStr(row["City"]);
    if (!rawCity || rawCity.toLowerCase().includes("total")) continue;

    let city = rawCity;
    let state = "Unknown";
    const match = rawCity.match(/^(.*?)\s*\((.*?)\)$/);
    if (match) {
      city = match[1].trim();
      state = match[2].trim();
    }
    
    const count2021 = parseNumber(row["2021"]);
    const count2022 = parseNumber(row["2022"]);
    const count2023 = parseNumber(row["2023"]);
    const rate = parseNumber(row["Rate of Total Cyber Crimes (2023)"]);
    const chargeSheetRate = parseNumber(row["Chargesheeting Rate (2023)"]);

    const metadata = {
      cases2021: count2021,
      cases2022: count2022,
      cases2023: count2023,
      crimeRate: rate,
      chargeSheetRate: chargeSheetRate
    };

    if (count2023 > 0) {
      await prisma.governmentCityCybercrime.upsert({
        where: { city_state: { city, state } },
        update: { crimeCount: count2023, metadata },
        create: { city, state, year: 2023, crimeCount: count2023, metadata },
      });
      inserted++;
    }
  }
  console.log(`✅ Upserted ${inserted} cities.`);
}

async function ingestDistricts() {
  console.log("Loading districts from", DISTRICTS_FILE);
  if (!fs.existsSync(DISTRICTS_FILE)) return;
  const content = fs.readFileSync(DISTRICTS_FILE, "utf8");
  const records = parse(content, { columns: true, skip_empty_lines: true, relax_quotes: true });

  let inserted = 0;
  for (const row of records as any[]) {
    const state = cleanStr(row["State/UT"]);
    const district = cleanStr(row["District"]);
    if (!district || district.toLowerCase().includes("total")) continue;

    const countKey = Object.keys(row).find((k) => k.includes("Total Cyber Crimes"));
    const itActKey = Object.keys(row).find((k) => k.includes("Total Offences under I.T. Act"));
    const ipcKey = Object.keys(row).find((k) => k.includes("Total Offences under IPC r/w IT Act"));
    const fraudKey = Object.keys(row).find((k) => k.includes("Fraud (Sec.420 r/w Sec.465,468-471 IPC) (Total)"));
    const identityTheftKey = Object.keys(row).find((k) => k.includes("Identity Theft"));
    
    if (!countKey) continue;
    
    const count = parseNumber(row[countKey]);
    
    const metadata = {
      totalItAct: itActKey ? parseNumber(row[itActKey]) : 0,
      totalIpc: ipcKey ? parseNumber(row[ipcKey]) : 0,
      fraud: fraudKey ? parseNumber(row[fraudKey]) : 0,
      identityTheft: identityTheftKey ? parseNumber(row[identityTheftKey]) : 0,
    };

    if (count > 0) {
      await prisma.governmentDistrictCybercrime.upsert({
        where: { district_state: { district, state } },
        update: { crimeCount: count, metadata },
        create: { district, state, year: 2023, crimeCount: count, metadata },
      });
      inserted++;
    }
  }
  console.log(`✅ Upserted ${inserted} districts.`);
}

async function seedCoordinates() {
  console.log("Seeding base coordinates using country-state-city...");
  
  const states = State.getStatesOfCountry("IN");
  let stCount = 0;
  for (const st of states) {
    if (st.latitude && st.longitude) {
      const lat = parseFloat(st.latitude);
      const lng = parseFloat(st.longitude);
      await prisma.stateCoordinate.upsert({
        where: { name: st.name },
        update: { lat, lng },
        create: { name: st.name, lat, lng },
      });
      stCount++;
    }
  }

  const cities = City.getCitiesOfCountry("IN");
  let ctCount = 0;
  let skipped = 0;
  
  // We use chunks to speed up DB inserts if needed, but sequential is fine for a one-off
  for (const ct of cities || []) {
    if (!ct.latitude || !ct.longitude) continue;
    const lat = parseFloat(ct.latitude);
    const lng = parseFloat(ct.longitude);
    const state = states.find(s => s.isoCode === ct.stateCode)?.name || ct.stateCode;

    // Remove terms like "District" to match the CSVs better
    const cleanName = ct.name.replace(/ District/i, "").trim();

    try {
      await prisma.cityCoordinate.upsert({
        where: { name_state: { name: cleanName, state } },
        update: { lat, lng },
        create: { name: cleanName, state, lat, lng },
      });

      // Because Districts and Cities often share names in India, we seed both
      await prisma.districtCoordinate.upsert({
        where: { name_state: { name: cleanName, state } },
        update: { lat, lng },
        create: { name: cleanName, state, lat, lng },
      });
      ctCount++;
    } catch (e) {
      skipped++;
    }
  }

  console.log(`✅ Coordinates seeded: ${stCount} states, ${ctCount} cities/districts. (${skipped} skipped)`);
}

async function main() {
  console.log("--- Starting NCRB Ingestion Pipeline ---");
  await seedCoordinates();
  await ingestStates();
  await ingestCities();
  await ingestDistricts();
  console.log("--- Ingestion Complete ---");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
