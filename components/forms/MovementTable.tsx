"use client";

import { NATIONALITY_CODES } from "@/lib/constants/nationalities";
import type { MovementInput } from "@/types/reports";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  movementType: "arrival" | "departure";
  rows: MovementInput[];
  onChange: (rows: MovementInput[]) => void;
  readOnly?: boolean;
};

function emptyRow(movementType: "arrival" | "departure"): MovementInput {
  return { movementType, nationalityCode: "UG", male: 0, female: 0 };
}

export function MovementTable({
  title,
  movementType,
  rows,
  onChange,
  readOnly,
}: Props) {
  const filtered = rows.filter((r) => r.movementType === movementType);

  function updateRow(index: number, patch: Partial<MovementInput>) {
    const next = [...rows];
    const globalIndex = rows.findIndex(
      (r, i) =>
        r.movementType === movementType &&
        filtered.indexOf(r) === index &&
        rows.slice(0, i + 1).filter((x) => x.movementType === movementType)
          .length ===
          index + 1,
    );
    const target =
      globalIndex >= 0
        ? globalIndex
        : rows.findIndex((r) => r === filtered[index]);
    if (target < 0) return;
    next[target] = { ...next[target], ...patch };
    onChange(next);
  }

  function addRow() {
    onChange([...rows, emptyRow(movementType)]);
  }

  function removeRow(index: number) {
    const target = rows.findIndex((r) => r === filtered[index]);
    onChange(rows.filter((_, i) => i !== target));
  }

  const maleTotal = filtered.reduce((s, r) => s + r.male, 0);
  const femaleTotal = filtered.reduce((s, r) => s + r.female, 0);

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
        {!readOnly && (
          <Button type="button" variant="secondary" size="sm" onClick={addRow}>
            Add nationality
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-zinc-50 text-left">
              <th className="p-2">Nationality</th>
              <th className="p-2 w-24">Male</th>
              <th className="p-2 w-24">Female</th>
              <th className="p-2 w-24">Total</th>
              {!readOnly && <th className="p-2 w-16" />}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={`${row.nationalityCode}-${i}`} className="border-b">
                <td className="p-2">
                  {readOnly ? (
                    row.nationalityCode
                  ) : (
                    <select
                      className="w-full rounded border px-2 py-1"
                      value={row.nationalityCode}
                      onChange={(e) =>
                        updateRow(i, {
                          nationalityCode: e.target.value,
                        })
                      }
                    >
                      {NATIONALITY_CODES.map((n) => (
                        <option key={n.code} value={n.code}>
                          {n.label} ({n.code})
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    min={0}
                    readOnly={readOnly}
                    className="w-full rounded border px-2 py-1"
                    value={row.male}
                    onChange={(e) =>
                      updateRow(i, { male: Number(e.target.value) || 0 })
                    }
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    min={0}
                    readOnly={readOnly}
                    className="w-full rounded border px-2 py-1"
                    value={row.female}
                    onChange={(e) =>
                      updateRow(i, { female: Number(e.target.value) || 0 })
                    }
                  />
                </td>
                <td className="p-2 font-medium">{row.male + row.female}</td>
                {!readOnly && (
                  <td className="p-2">
                    <button
                      type="button"
                      className="text-red-600 text-xs"
                      onClick={() => removeRow(i)}
                    >
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-zinc-50 font-semibold">
              <td className="p-2">Total</td>
              <td className="p-2">{maleTotal}</td>
              <td className="p-2">{femaleTotal}</td>
              <td className="p-2">{maleTotal + femaleTotal}</td>
              {!readOnly && <td />}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
