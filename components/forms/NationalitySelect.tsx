"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useAppPreferences } from "@/components/providers/AppPreferencesProvider";
import { parseCountryInput } from "@/lib/countries/parse-input";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (code: string) => void;
  required?: boolean;
  optional?: boolean;
  disabled?: boolean;
  className?: string;
};

type DropdownPos = {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
};

export function NationalitySelect({
  value,
  onChange,
  required,
  optional,
  disabled,
  className,
}: Props) {
  const { countries, loading, error, countryCodeFormat } = useAppPreferences();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<DropdownPos | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const selected = useMemo(
    () => countries.find((c) => c.code === value),
    [countries, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.alpha2.toLowerCase().includes(q) ||
        c.alpha3.toLowerCase().includes(q),
    );
  }, [countries, query]);

  const updatePosition = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 4;
    const preferred = 280;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUp = spaceBelow < preferred && spaceAbove > spaceBelow;
    const maxHeight = Math.min(
      preferred,
      openUp ? spaceAbove - 8 : spaceBelow - 8,
      window.innerHeight - 16,
    );

    if (openUp) {
      setPos({
        left: rect.left,
        width: rect.width,
        maxHeight: Math.max(120, maxHeight),
        bottom: window.innerHeight - rect.top + gap,
      });
    } else {
      setPos({
        left: rect.left,
        width: rect.width,
        maxHeight: Math.max(120, maxHeight),
        top: rect.bottom + gap,
      });
    }
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, filtered.length, updatePosition]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (inputRef.current?.contains(t)) return;
      const list = document.getElementById(listId);
      if (list?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, listId]);

  useEffect(() => {
    if (selected) {
      setQuery(`${selected.name} (${selected.code})`);
    } else if (!value) {
      setQuery("");
    }
  }, [selected, value]);

  function pick(code: string, label: string) {
    onChange(code);
    setQuery(label);
    setOpen(false);
  }

  function commitQuery() {
    const parsed = parseCountryInput(query, countries);
    if (parsed) {
      const c = countries.find(
        (x) =>
          x.code === parsed ||
          x.alpha2 === parsed ||
          x.alpha3 === parsed,
      );
      if (c) {
        pick(c.code, `${c.name} (${c.code})`);
        return;
      }
      onChange(parsed);
    }
  }

  const codeHint =
    countryCodeFormat === "alpha2"
      ? "2-letter ISO codes (e.g. UG, KE)"
      : "3-letter ISO codes (e.g. UGA, KEN)";

  const list =
    open && !loading && mounted && pos && filtered.length > 0
      ? createPortal(
          <ul
            id={listId}
            role="listbox"
            className="fixed z-[200] overflow-y-auto overscroll-contain rounded-md border border-zinc-300 bg-white py-1 shadow-xl"
            style={{
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight,
              top: pos.top,
              bottom: pos.bottom,
              scrollPaddingBottom: "12px",
            }}
          >
            {optional && (
              <li>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick("", "—")}
                >
                  — No nationality
                </button>
              </li>
            )}
            {filtered.map((c) => (
              <li key={`${c.alpha2}-${c.alpha3}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={c.code === value}
                  className={cn(
                    "w-full px-3 py-2.5 text-left text-sm hover:bg-emerald-50",
                    c.code === value && "bg-emerald-100 font-semibold",
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(c.code, `${c.name} (${c.code})`)}
                >
                  <span className="text-zinc-900">{c.name}</span>
                  <span className="ml-2 tabular-nums text-zinc-600">
                    {c.code}
                  </span>
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        disabled={disabled || loading}
        required={required && !optional}
        placeholder={
          loading
            ? "Loading countries…"
            : optional
              ? "Search country (optional)"
              : "Select country — search by name or code"
        }
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (!e.target.value && optional) onChange("");
        }}
        onFocus={() => {
          setOpen(true);
          updatePosition();
        }}
        onBlur={() => {
          setOpen(false);
          window.setTimeout(() => commitQuery(), 120);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter" && open) {
            e.preventDefault();
            const first = filtered[0];
            if (first) pick(first.code, `${first.name} (${first.code})`);
          }
        }}
        className="w-full rounded border border-zinc-400 px-3 py-2 text-zinc-900"
      />
      <p className="mt-1 text-xs text-zinc-600">{codeHint}</p>
      {error && (
        <p className="mt-1 text-xs font-medium text-red-700">{error}</p>
      )}
      {list}
      {open && !loading && query && filtered.length === 0 && mounted && pos &&
        createPortal(
          <p
            className="fixed z-[200] rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 shadow-lg"
            style={{
              left: pos.left,
              width: pos.width,
              top: pos.top,
              bottom: pos.bottom,
            }}
          >
            No country matches &quot;{query}&quot;
          </p>,
          document.body,
        )}
    </div>
  );
}
