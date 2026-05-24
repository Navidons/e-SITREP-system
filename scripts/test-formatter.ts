import { formatEleguSampleCheck } from "../lib/reports/consolidated-formatter";

const expectedArrivals =
  "235 ARRIVALS: 01 BI, 17 ER (01 FE), 70 KE (04 FE), 01 RW, 122 SSD (43 FE), 09 SD (01 FE), 14 UG (04 FE), 01 TZ";
const expectedDepartures =
  "223 DEPARTURES: 04 BI, 09 ER (01 FE), 41 KE (15 FE), 116 SSD (36 FE), 08 SD, 44 UG (17 FE), 01 USA";
const expectedAsylum = "55 ASYLUM SEEKERS";

async function main() {
  const { arrivals, departures, asylum } = await formatEleguSampleCheck();

  let failed = 0;
  for (const [label, actual, expected] of [
    ["arrivals", arrivals, expectedArrivals],
    ["departures", departures, expectedDepartures],
    ["asylum", asylum, expectedAsylum],
  ] as const) {
    if (actual !== expected) {
      console.error(`FAIL ${label}:\n  got:      ${actual}\n  expected: ${expected}`);
      failed++;
    } else {
      console.log(`OK ${label}`);
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
