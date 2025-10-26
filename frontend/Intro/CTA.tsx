import React from "react";

export interface CTAProps {
  onGoHome: () => void;
  onLoadFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CTA({ onGoHome, onLoadFile }: CTAProps): JSX.Element {
  return (
    <section className="mx-auto my-20 lg:my-24 max-w-7xl p-[2px] rounded-[28px] bg-[linear-gradient(90deg,#2563eb, #8b5cf6,#ec4899)]">
      <div className="rounded-[26px] bg-white p-8 md:p-10 lg:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl md:text-3xl font-bold">Start building in minutes.</h3>
          <p className="text-gray-600 mt-2">Generate, iterate, and place your first model now.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onGoHome}
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow hover:bg-blue-700 transition"
          >
            Try the Builder
          </button>
          <label className="cursor-pointer rounded-xl border border-gray-300 bg-white px-6 py-3 font-semibold shadow hover:bg-gray-50 transition">
            Load Model
            <input
              type="file"
              accept=".stl,.glb,model/gltf-binary,model/stl"
              className="hidden"
              onChange={onLoadFile}
            />
          </label>
        </div>
      </div>
    </section>
  );
}
