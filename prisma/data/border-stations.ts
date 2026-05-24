/** Uganda NCIC entry/exit points — from WEEKLY STATISTICS 02.08 MAY 2026.xlsx (S/N order). */
export type BorderStationSeed = {
  code: string;
  name: string;
  cluster: string;
  type: "Air" | "Land" | "Water";
  /** Row order in NCIC weekly matrix (column "Entry/ Exit Points."). */
  displayOrder: number;
};

export const BORDER_STATIONS: BorderStationSeed[] = [
  { code: "ENT", name: "ENTEBBE", cluster: "Kampala", type: "Air", displayOrder: 1 }, // Entebbe
  { code: "BUS", name: "BUSIA", cluster: "Eastern", type: "Land", displayOrder: 2 }, // Busia
  { code: "LWA", name: "LWAKHAKHA", cluster: "Eastern", type: "Land", displayOrder: 3 }, // Lwakhakha
  { code: "MAL", name: "MALABA", cluster: "Eastern", type: "Land", displayOrder: 4 }, // Malaba
  { code: "SUA", name: "SUAM RIVER", cluster: "Eastern", type: "Land", displayOrder: 5 }, // Suam River
  { code: "ELE", name: "ELEGU", cluster: "Northern", type: "Land", displayOrder: 6 }, // Elegu
  { code: "MAD", name: "MADI OPEI", cluster: "Northern", type: "Land", displayOrder: 7 }, // Madi Opei
  { code: "MPO", name: "MPONDWE", cluster: "Western", type: "Land", displayOrder: 8 }, // Mpondwe
  { code: "ISH", name: "ISHASHA", cluster: "South-Western", type: "Land", displayOrder: 9 }, // Ishasha
  { code: "KYN", name: "KAYANJA", cluster: "South-Western", type: "Land", displayOrder: 10 }, // Kayanja
  { code: "MIR", name: "MIRAMA HILLS", cluster: "South-Western", type: "Land", displayOrder: 11 }, // Mirama Hills
  { code: "KIK", name: "KIKAGATI", cluster: "South-Western", type: "Land", displayOrder: 12 }, // Kikagati
  { code: "BUG", name: "BUGANGO", cluster: "South-Western", type: "Land", displayOrder: 13 }, // Bugango
  { code: "KIZ", name: "KIZINGA", cluster: "South-Western", type: "Land", displayOrder: 14 }, // Kizinga
  { code: "VUR", name: "VURRA", cluster: "Western", type: "Land", displayOrder: 15 }, // Vurra
  { code: "ODR", name: "ODRAMACHAKO", cluster: "Western", type: "Land", displayOrder: 16 }, // Odramachako
  { code: "AIR", name: "AIRFIELD", cluster: "Kampala", type: "Air", displayOrder: 17 }, // Airfield
  { code: "LIA", name: "LIA", cluster: "Western", type: "Land", displayOrder: 18 }, // Lia
  { code: "KAT", name: "KATUNA", cluster: "South-Western", type: "Land", displayOrder: 19 }, // Katuna
  { code: "KMW", name: "KAMWEZI", cluster: "South-Western", type: "Land", displayOrder: 20 }, // Kamwezi
  { code: "CYA", name: "CYANIKA", cluster: "South-Western", type: "Land", displayOrder: 21 }, // Cyanika
  { code: "BNG", name: "BUNAGANA", cluster: "South-Western", type: "Land", displayOrder: 22 }, // Bunagana
  { code: "BUT", name: "BUTOGOTA", cluster: "South-Western", type: "Land", displayOrder: 23 }, // Butogota
  { code: "BSZ", name: "BUSANZA", cluster: "South-Western", type: "Land", displayOrder: 24 }, // Busanza
  { code: "MUT", name: "MUTUKULA", cluster: "Southern", type: "Land", displayOrder: 25 }, // Mutukula
  { code: "KAN", name: "KANSENSERO", cluster: "Southern", type: "Land", displayOrder: 26 }, // Kansensero
  { code: "NGO", name: "NGOMOROMO", cluster: "Northern", type: "Land", displayOrder: 27 }, // Ngomoromo
  { code: "WAL", name: "WALIGO", cluster: "Northern", type: "Land", displayOrder: 28 }, // Waligo
  { code: "AWO", name: "AWENO-OLWIYO", cluster: "Northern", type: "Land", displayOrder: 29 }, // Aweno-Olwiyo
  { code: "ORA", name: "ORABA", cluster: "Northern", type: "Land", displayOrder: 30 }, // Oraba
  { code: "AFO", name: "AFOGI", cluster: "Northern", type: "Land", displayOrder: 31 }, // Afogi
  { code: "GOL", name: "GOLI", cluster: "Northern", type: "Land", displayOrder: 32 }, // Goli
  { code: "DEI", name: "DEI", cluster: "Northern", type: "Land", displayOrder: 33 }, // Dei
  { code: "PAI", name: "PAIDHA", cluster: "Western", type: "Land", displayOrder: 34 }, // Paidha
  { code: "PAD", name: "PADEA", cluster: "Western", type: "Land", displayOrder: 35 }, // Padea
  { code: "NTO", name: "NTOROKO", cluster: "Western", type: "Land", displayOrder: 36 }, // Ntoroko
  { code: "BSN", name: "BUSUNGA", cluster: "Western", type: "Land", displayOrder: 37 }, // Busunga
  { code: "RWE", name: "RWEBISENGO", cluster: "Western", type: "Land", displayOrder: 38 }, // Rwebisengo
  { code: "BTB", name: "BUTIABA", cluster: "Western", type: "Land", displayOrder: 39 }, // Butiaba
  { code: "WAN", name: "WANSEKO", cluster: "Western", type: "Land", displayOrder: 40 }, // Wanseko
  { code: "SEB", name: "SEBAGORO", cluster: "Western", type: "Land", displayOrder: 41 }, // Sebagoro
  { code: "KAI", name: "KAISO-TONYA", cluster: "Western", type: "Land", displayOrder: 42 }, // Kaiso-Tonya
  { code: "NDA", name: "NDAIGA", cluster: "Western", type: "Land", displayOrder: 43 }, // Ndaiga
  { code: "NSO", name: "NSONGA", cluster: "Western", type: "Land", displayOrder: 44 }, // Nsonga
  { code: "PBL", name: "PORTBELL", cluster: "Kampala", type: "Water", displayOrder: 45 }, // Portbell
  { code: "OPO", name: "OPOTPOT", cluster: "Northern", type: "Land", displayOrder: 46 }, // Opotpot
  { code: "KMN", name: "KAMION", cluster: "Northern", type: "Land", displayOrder: 47 }, // Kamion
  { code: "MRT", name: "MOROTO AIRSTRIP", cluster: "Northern", type: "Air", displayOrder: 48 }, // Moroto Airstrip
  { code: "AMU", name: "AMUDAT", cluster: "Northern", type: "Land", displayOrder: 49 }, // Amudat
  { code: "NAK", name: "NAKABAAT", cluster: "Northern", type: "Land", displayOrder: 50 }, // Nakabaat
  { code: "KDP", name: "KIDEPO AIRSTRIP", cluster: "Northern", type: "Air", displayOrder: 51 }, // Kidepo Airstrip
  { code: "KMK", name: "KIMAKA AIRSTRIP", cluster: "Kampala", type: "Air", displayOrder: 52 }, // Kimaka Airstrip
  { code: "KAK", name: "KAKIRA AIRSTRIP", cluster: "Eastern", type: "Air", displayOrder: 53 }, // Kakira Airstrip
  { code: "LOL", name: "LOLWE ISLAND", cluster: "Southern", type: "Water", displayOrder: 54 }, // Lolwe Island
  { code: "SIG", name: "SINGULU ISLAND", cluster: "Southern", type: "Water", displayOrder: 55 }, // Singulu Island
  { code: "JIN", name: "JINJA PORT", cluster: "Eastern", type: "Water", displayOrder: 56 }, // Jinja port
];

export function stationInputterUsername(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.inputter`;
}
