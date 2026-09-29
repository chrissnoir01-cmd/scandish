import type { ShowcaseRestaurant } from "@/lib/server/showcase";

/**
 * The customer row under the hero: logos of live restaurants slowly moving past (pure CSS; pauses on
 * hover; still for people who prefer less motion). Hidden entirely when no customer has a logo yet.
 */
export default function LogoMarquee({ restaurants, liveCount }: { restaurants: ShowcaseRestaurant[]; liveCount: number }) {
  if (restaurants.length === 0) return null;

  // Repeat the list so one run is wider than any screen, then run it twice for a seamless loop.
  const run = Array.from({ length: Math.max(1, Math.ceil(10 / restaurants.length)) }, () => restaurants).flat();
  const loop = [...run, ...run];

  return (
    <section className="border-y border-[var(--line)] bg-[var(--paper-2)] py-9" aria-labelledby="customers-title">
      <div className="mx-auto mb-6 flex max-w-6xl items-baseline justify-between gap-4 px-5">
        <h2 id="customers-title" className="text-sm font-medium text-[var(--ink-2)]">
          Restaurants already serving their menu with ScanDish
        </h2>
        {liveCount > 0 && <p className="hidden text-sm text-[var(--muted)] sm:block">{liveCount} live menus</p>}
      </div>
      <div className="marquee relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <ul className="marquee-track flex w-max gap-4" style={{ "--marquee-duration": `${run.length * 4}s` } as React.CSSProperties}>
          {loop.map((r, i) => (
            // Only the first copy is reachable by keyboard and screen readers.
            <li key={`${r.url}-${i}`} aria-hidden={i >= run.length || undefined}>
              <a
                href={r.url}
                tabIndex={i >= run.length ? -1 : undefined}
                className="flex items-center gap-3 rounded-full border border-[var(--line)] bg-[var(--paper)] py-2 pl-2 pr-5 transition hover:border-[var(--ink-2)]"
              >
                <img src={r.logo} alt="" width={40} height={40} loading="lazy" className="h-10 w-10 rounded-full object-cover" />
                <span className="whitespace-nowrap text-sm font-medium">{r.name}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
