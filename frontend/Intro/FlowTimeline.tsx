// src/components/intro/FlowTimeline.tsx
import React from "react";
import { motion } from "framer-motion";

type Step = { t: string; d: string };
type Slot = Step & { col: 1 | 2; row: number };

export function FlowTimeline(): JSX.Element {
  // Define the exact slots you want (blank rows are implicit)
  const slots: Slot[] = [
    { t: "Start", d: "Welcome screen with previews & recent models.", col: 1, row: 1 },
    { t: "Prompt AI", d: "Describe the part — text or voice.", col: 2, row: 2 },
    { t: "Mini Preview", d: "Quick render with smart defaults.", col: 1, row: 4 },
    { t: "Edit Parameters", d: "Sliders for size, features, materials.", col: 2, row: 5 },
    { t: "Open in AR", d: "Place, scale, and voice-edit in space.", col: 1, row: 7 },
    { t: "Export", d: "Save .stl / .glb or send to a 3D printer.", col: 2, row: 8 },
  ];

  // The plain sequence for mobile stacking
  const mobileSteps: Step[] = [
    { t: "Start", d: "Welcome screen with previews & recent models." },
    { t: "Prompt AI", d: "Describe the part — text or voice." },
    { t: "Mini Preview", d: "Quick render with smart defaults." },
    { t: "Edit Parameters", d: "Sliders for size, features, materials." },
    { t: "Open in AR", d: "Place, scale, and voice-edit in space." },
    { t: "Export", d: "Save .stl / .glb or send to a 3D printer." },
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="text-center mb-12">
        <p className="text-xs font-semibold tracking-[0.18em] text-blue-600">FLOW</p>
        <h2 className="mt-2 text-3xl md:text-4xl font-bold">From idea to artifact</h2>
        <p className="mt-3 text-gray-600">A clear path that lets you stay in flow—no detours.</p>
      </div>

      {/* Mobile: simple stacked list */}
      <div className="md:hidden grid grid-cols-1 gap-y-14">
        {mobileSteps.map((s, i) => (
          <TimelineCard key={s.t} title={s.t} desc={s.d} align="left" index={i} />
        ))}
      </div>

      {/* Desktop: explicit 2-col grid with empty rows left blank */}
      <div className="relative hidden md:grid md:grid-cols-2 gap-x-12"
           style={{ gridAutoRows: "minmax(0, auto)"}}>
        {/* Center divider */}
        <div className="pointer-events-none absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px bg-gradient-to-b from-blue-600 via-violet-600 to-fuchsia-600" />

        {slots.map((s, i) => (
          <div
            key={`${s.t}-${s.row}`}
            // Place into exact column/row; leaving blank rows creates your “invisible boxes”
            style={{ gridColumnStart: s.col, gridRowStart: s.row }}
            className={s.col === 1 ? "md:pr-12 md:text-right" : "md:pl-12 md:text-left"}
          >
            <TimelineCard title={s.t} desc={s.d} align={s.col === 1 ? "right" : "left"} index={i} />
          </div>
        ))}
      </div>
    </section>
  );
}

/** A single timeline block (title + copy + demo card). */
function TimelineCard({
  title,
  desc,
  align,
  index,
}: {
  title: string;
  desc: string;
  align: "left" | "right";
  index: number;
}): JSX.Element {
  const isLeft = align === "left";
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.45, delay: index * 0.04 }}
      className={isLeft ? "text-left" : "text-right"}
    >
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-gray-600 mt-1">{desc}</p>

      <div className="mt-4 w-full">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow">
          <div className="h-24 md:h-28 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <div className="h-4 w-4 rounded-full border-2 border-blue-600" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
