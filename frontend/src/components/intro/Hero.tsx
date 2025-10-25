import React from "react";
import { motion } from "framer-motion";

export interface HeroProps {
  onGoHome: () => void;
  onLoadFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function Hero({ onGoHome, onLoadFile }: HeroProps): JSX.Element {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 pt-24">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 h-[40rem] w-[40rem] rounded-full blur-3xl opacity-30"
          style={{
            background:
              "radial-gradient(closest-side,#60a5fa,#a78bfa,#f472b6 60%,transparent)",
          }}
        />
      </div>

      <div className="w-full max-w-6xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center font-bold tracking-tight leading-none"
        >
          <span className="block text-5xl sm:text-6xl md:text-7xl">
            Generate. Edit.{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600">
              Place
            </span>
            .
          </span>
          <span className="mt-4 block text-lg sm:text-xl text-gray-600">
            From text → CAD → AR. Design medical concepts you can hold.
          </span>
        </motion.h1>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.45 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <button
            onClick={onGoHome}
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition"
          >
            Ask AI for a Model
          </button>

          <label className="cursor-pointer rounded-xl border border-gray-300 bg-white px-6 py-3 font-semibold shadow hover:bg-gray-50 transition">
            Load .stl / .glb
            <input
              type="file"
              accept=".stl,.glb,model/gltf-binary,model/stl"
              className="hidden"
              onChange={onLoadFile}
            />
          </label>
        </motion.div>

        {/* Mini 3D Preview */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="mt-16 w-full max-w-4xl mx-auto"
        >
          <div className="rounded-2xl border border-gray-200 bg-white/70 backdrop-blur shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-yellow-400" />
                <span className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <p className="text-sm text-gray-500">Mini 3D Preview</p>
            </div>
            <div className="aspect-video w-full overflow-hidden rounded-b-2xl bg-gradient-to-br from-gray-100 to-gray-200 relative">
              <div className="absolute inset-0 bg-[linear-gradient(transparent_0_23px,#e5e7eb_24px),linear-gradient(90deg,transparent_0_23px,#e5e7eb_24px)] bg-[length:24px_24px]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-pulse rounded-full border-4 border-gray-300/70 p-10">
                  <div className="h-14 w-14 rounded-lg bg-gray-300" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
