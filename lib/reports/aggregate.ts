export type MovementRow = {
  movementType: "arrival" | "departure";
  nationalityCode: string;
  male: number;
  female: number;
};

export type SpecialRow = {
  category: string;
  male: number;
  female: number;
};

export function aggregateMovements(
  entries: MovementRow[],
): Array<MovementRow & { male: number; female: number }> {
  const map = new Map<string, { male: number; female: number }>();

  for (const e of entries) {
    const key = `${e.movementType}:${e.nationalityCode}`;
    const cur = map.get(key) ?? { male: 0, female: 0 };
    map.set(key, {
      male: cur.male + e.male,
      female: cur.female + e.female,
    });
  }

  return [...map.entries()].map(([key, counts]) => {
    const [movementType, nationalityCode] = key.split(":");
    return {
      movementType: movementType as MovementRow["movementType"],
      nationalityCode,
      male: counts.male,
      female: counts.female,
    };
  });
}

export function aggregateSpecialCategories(
  entries: SpecialRow[],
): SpecialRow[] {
  const map = new Map<string, { male: number; female: number }>();

  for (const e of entries) {
    const cur = map.get(e.category) ?? { male: 0, female: 0 };
    map.set(e.category, {
      male: cur.male + e.male,
      female: cur.female + e.female,
    });
  }

  return [...map.entries()].map(([category, counts]) => ({
    category,
    male: counts.male,
    female: counts.female,
  }));
}

export function movementTotals(entries: MovementRow[], type: "arrival" | "departure") {
  const filtered = entries.filter((e) => e.movementType === type);
  const male = filtered.reduce((s, e) => s + e.male, 0);
  const female = filtered.reduce((s, e) => s + e.female, 0);
  return { male, female, total: male + female };
}
