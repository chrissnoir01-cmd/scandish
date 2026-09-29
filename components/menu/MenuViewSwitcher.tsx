"use client";

import { useCallback, useEffect, useState } from "react";
import { LayoutGrid, LayoutList, PanelTop } from "lucide-react";

/** How a guest reads the menu: compact rows, photo cards, or a photo grid. */
export type MenuView = "bar" | "card" | "square";

const VIEWS: { id: MenuView; label: string; Icon: typeof LayoutList }[] = [
  { id: "bar", label: "Bar", Icon: LayoutList },
  { id: "card", label: "Cards", Icon: PanelTop },
  { id: "square", label: "Grid", Icon: LayoutGrid },
];

const storageKey = (slug: string) => `scandish.menuView.${slug}`;

/** The guest's chosen view, remembered on their phone per menu. Starts from the page's default. */
export function useMenuView(slug: string | undefined, initial: MenuView): [MenuView, (v: MenuView) => void] {
  const [view, setView] = useState<MenuView>(initial);

  useEffect(() => {
    if (!slug) return;
    try {
      const saved = localStorage.getItem(storageKey(slug));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the saved choice only exists in the browser, after the prebuilt page loads
      if (saved === "bar" || saved === "card" || saved === "square") setView(saved);
    } catch {
      // Storage blocked (private mode): the default view is fine.
    }
  }, [slug]);

  const choose = useCallback(
    (v: MenuView) => {
      setView(v);
      try {
        if (slug) localStorage.setItem(storageKey(slug), v);
      } catch {
        // Not remembered; still switches.
      }
    },
    [slug]
  );

  return [view, choose];
}

/**
 * Three-button switch. Colours come from the page: `accent` fills the chosen button,
 * `dark` adapts the idle buttons to dark pages.
 */
export default function MenuViewSwitcher({
  value,
  onChange,
  accent,
  accentText = "#ffffff",
  dark = false,
  className = "",
}: {
  value: MenuView;
  onChange: (v: MenuView) => void;
  accent: string;
  accentText?: string;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Menu layout"
      className={`inline-flex items-center gap-1 rounded-full border p-1 ${dark ? "border-white/15 bg-white/5" : "border-black/10 bg-black/[0.04]"} ${className}`}
    >
      {VIEWS.map(({ id, label, Icon }) => {
        const on = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={on}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-colors ${
              on ? "shadow-sm" : dark ? "text-white/60 hover:text-white" : "text-black/50 hover:text-black/80"
            }`}
            style={on ? { backgroundColor: accent, color: accentText } : undefined}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
