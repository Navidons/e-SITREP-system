/** Uganda NCIC border posts for demo / testing (expand via Admin as needed). */
export type BorderStationSeed = {
  code: string;
  name: string;
  cluster: string;
  type: "Air" | "Land" | "Water";
};

export const BORDER_STATIONS: BorderStationSeed[] = [
  { code: "ENT", name: "ENTEBBE", cluster: "Kampala", type: "Air" },
  { code: "BUS", name: "BUSIA", cluster: "Eastern", type: "Land" },
  { code: "MAL", name: "MALABA", cluster: "Eastern", type: "Land" },
  { code: "LWA", name: "LWAKHAKHA", cluster: "Eastern", type: "Land" },
  { code: "SUA", name: "SUAM", cluster: "Eastern", type: "Land" },
  { code: "ELE", name: "ELEGU", cluster: "Northern", type: "Land" },
  { code: "ORA", name: "ORABA", cluster: "Northern", type: "Land" },
  { code: "NGO", name: "NGOMOROMO", cluster: "Northern", type: "Land" },
  { code: "MOY", name: "MOYO", cluster: "Northern", type: "Land" },
  { code: "AFO", name: "AFODE", cluster: "Northern", type: "Land" },
  { code: "LAR", name: "LAROPI", cluster: "Northern", type: "Land" },
  { code: "GOL", name: "GOLI", cluster: "Northern", type: "Land" },
  { code: "WAD", name: "WADELAI", cluster: "Northern", type: "Land" },
  { code: "LIA", name: "LIA", cluster: "Northern", type: "Land" },
  { code: "MPO", name: "MPONDWE", cluster: "Western", type: "Land" },
  { code: "VUR", name: "VURRA", cluster: "Western", type: "Land" },
  { code: "PAI", name: "PAIDHA", cluster: "Western", type: "Land" },
  { code: "BNG", name: "BUNAGANA", cluster: "Western", type: "Land" },
  { code: "NDA", name: "NDAIGA", cluster: "Western", type: "Land" },
  { code: "KAY", name: "KAYA", cluster: "Western", type: "Land" },
  { code: "KAT", name: "KATUNA", cluster: "South-Western", type: "Land" },
  { code: "MIR", name: "MIRAMA HILLS", cluster: "South-Western", type: "Land" },
  { code: "CYA", name: "CYANIKA", cluster: "South-Western", type: "Land" },
  { code: "KMW", name: "KAMWEZI", cluster: "South-Western", type: "Land" },
  { code: "MUT", name: "MUTUKULA", cluster: "Southern", type: "Land" },
  { code: "KAG", name: "KAGITUMBA", cluster: "Southern", type: "Land" },
  { code: "ISI", name: "ISINGIRO", cluster: "Southern", type: "Land" },
  { code: "NAM", name: "NAMAYIBA", cluster: "Eastern", type: "Water" },
  { code: "ADJ", name: "ADJUMANI", cluster: "Northern", type: "Land" },
  { code: "ODO", name: "ODOKO", cluster: "Northern", type: "Land" },
];

export function stationInputterUsername(name: string): string {
  return `${name.toLowerCase().replace(/\s+/g, "")}.inputter`;
}
