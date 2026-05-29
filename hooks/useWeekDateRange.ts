"use client";

import { useCallback, useMemo, useState } from "react";
import {
  WEEK_DAY_COUNT,
  addDaysIso,
  countInclusiveDays,
  weekEndFromStart,
  weekStartFromEnd,
} from "@/lib/dates/week-range";
import { formatDateInput } from "@/lib/utils";

function defaultWeek(): { from: string; to: string } {
  const to = formatDateInput(new Date());
  const from = addDaysIso(to, -(WEEK_DAY_COUNT - 1));
  return { from, to };
}

export function useWeekDateRange(initial?: { from: string; to: string }) {
  const [from, setFromState] = useState(initial?.from ?? defaultWeek().from);
  const [to, setToState] = useState(initial?.to ?? defaultWeek().to);

  const setFrom = useCallback((nextFrom: string) => {
    setFromState(nextFrom);
    setToState(weekEndFromStart(nextFrom));
  }, []);

  const setTo = useCallback((nextTo: string) => {
    setToState(nextTo);
    setFromState(weekStartFromEnd(nextTo));
  }, []);

  const setWeek = useCallback((range: { from: string; to: string }) => {
    setFromState(range.from);
    setToState(range.to);
  }, []);

  const dayCount = useMemo(() => countInclusiveDays(from, to), [from, to]);

  const isSevenDayWeek = dayCount === WEEK_DAY_COUNT;

  return {
    from,
    to,
    setFrom,
    setTo,
    setWeek,
    dayCount,
    isSevenDayWeek,
    weekDayCount: WEEK_DAY_COUNT,
  };
}
