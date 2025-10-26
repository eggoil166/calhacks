import React from "react";
import { motion } from "framer-motion";

export interface FeatureRowProps {
  eyebrow: string;
  title: string;
  copy: string;
  bullets: string[];
  reverse?: boolean; // optional to avoid "missing prop" errors
}

export function FeatureRow({
  eyebrow,
  title,
  copy,
  bullets,
  reverse = false,
}: FeatureRowProps): JSX.Element {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`mx-auto max-w-6xl px-6 py-20 grid items-center gap-12 md:grid-cols-2 ${
        reverse ? "md:[&>*:first-child]:order-2" : ""
      }`}
    >
      {/* Visual placeholder */}
      <div className="relative">
        <div className="aspect-video w-full rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200 shadow-lg overflow-hidden" />
        <div className="pointer-events-none absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-br from-blue-200/40 via-violet-200/40 to-fuchsia-200/40 blur-2xl" />
      </div>

      <div>
        <p className="text-sm uppercase tracking-wider text-blue-600">{eyebrow}</p>
        <h2 className="mt-2 text-3xl md:text-4xl font-bold">{title}</h2>
        <p className="mt-4 text-gray-600">{copy}</p>
        <ul className="mt-6 space-y-2 text-gray-800">
          {bullets.map((b: string, i: number) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-blue-600" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.section>
  );
}
