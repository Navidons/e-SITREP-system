"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widthClass?: string;
  side?: "left" | "right";
  className?: string;
};

export function useDrawer(id: string, defaultOpenOnLg = true) {
  const [open, setOpenState] = useState(defaultOpenOnLg);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`esitrep-drawer-${id}`);
    if (saved === "0" || saved === "1") {
      setOpenState(saved === "1");
    } else {
      setOpenState(
        window.matchMedia("(min-width: 1024px)").matches && defaultOpenOnLg,
      );
    }
    setReady(true);
  }, [id, defaultOpenOnLg]);

  const setOpen = useCallback(
    (value: boolean) => {
      setOpenState(value);
      localStorage.setItem(`esitrep-drawer-${id}`, value ? "1" : "0");
    },
    [id],
  );

  return { open, setOpen, ready };
}

export function DrawerToggle({
  label,
  onClick,
  active,
  className,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold shadow-sm transition",
        active
          ? "border-emerald-800 bg-emerald-800 text-white"
          : "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50",
        className,
      )}
    >
      <span aria-hidden className="text-base leading-none">
        ☰
      </span>
      {label}
    </button>
  );
}

function DrawerPanel({
  id,
  title,
  subtitle,
  children,
  onClose,
  widthClass,
  side,
  className,
  mobile,
}: Props & { onClose: () => void; mobile?: boolean }) {
  const isRight = side === "right";
  return (
    <aside
      id={`drawer-${id}`}
      role="dialog"
      aria-modal={mobile}
      aria-label={title}
      className={cn(
        "flex h-full flex-col bg-white",
        mobile
          ? cn(
              "fixed inset-y-0 z-50 w-[min(100vw,20rem)] shadow-xl",
              isRight ? "right-0 border-l border-zinc-300" : "left-0 border-r border-zinc-300",
            )
          : cn(
              "rounded-lg border border-zinc-300 shadow-sm",
              widthClass,
              "max-h-[calc(100vh-8rem)]",
            ),
        className,
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-zinc-200 px-3 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
            {title}
          </p>
          {subtitle && <p className="text-sm text-zinc-700">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100"
          aria-label={`Close ${title}`}
        >
          ×
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </aside>
  );
}

export function Drawer(props: Props) {
  const { open, onOpenChange, side = "left" } = props;
  const [mounted, setMounted] = useState(false);
  const isRight = side === "right";

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open || !mounted) return;
    const mq = window.matchMedia("(max-width: 1023px)");
    function lock() {
      if (mq.matches) document.body.style.overflow = "hidden";
    }
    function unlock() {
      document.body.style.overflow = "";
    }
    lock();
    mq.addEventListener("change", lock);
    return () => {
      mq.removeEventListener("change", lock);
      unlock();
    };
  }, [open, mounted]);

  const close = () => onOpenChange(false);

  const mobileOverlay =
    mounted &&
    open &&
    createPortal(
      <div className="lg:hidden">
        <div
          className="fixed inset-0 z-40 bg-black/40"
          aria-hidden
          onClick={close}
        />
        <div
          className={cn(
            "fixed inset-y-0 z-50 transition-transform duration-300 ease-out",
            isRight ? "right-0" : "left-0",
          )}
        >
          <DrawerPanel {...props} onClose={close} mobile />
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      {open && (
        <div className={cn("hidden shrink-0 lg:flex", props.widthClass ?? "w-64")}>
          <DrawerPanel {...props} onClose={close} />
        </div>
      )}
      {mobileOverlay}
    </>
  );
}
