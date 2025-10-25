import React, { useEffect } from "react";
import { Hero } from "../components/intro/Hero";
import { FeatureRow } from "../components/intro/FeatureRow";
import { FlowTimeline } from "../components/intro/FlowTimeline";
import { CTA } from "../components/intro/CTA";

export default function Intro(): JSX.Element {
  // Always start at the top (and prevent browser restoring a previous scroll)
  useEffect(() => {
    window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
  }, []);

  const goToHome = () => {
    window.location.href = "/home";
  };

  const handleLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const evt: CustomEvent<File> = new CustomEvent<File>("intro:loadFile", { detail: file });
    window.dispatchEvent(evt);
    window.location.href = "/home";
  };

  return (
    <div className="bg-gradient-to-b from-white via-gray-50 to-gray-100 text-gray-900">
      {/* HERO */}
      <Hero onGoHome={goToHome} onLoadFile={handleLoadFile} />

      {/* FEATURES */}
      <FeatureRow
        eyebrow="Natural language → CAD"
        title="Prompt AI, get parametric parts"
        copy="Describe the part. We map language to fully parameterized CAD you can tweak with sliders or voice."
        bullets={["Text & voice prompts", "Auto-generated parameters & units", "Smart defaults + warnings"]}
      />

      <FeatureRow
        reverse
        eyebrow="Edit anywhere"
        title="Jarvis-style editing in AR"
        copy="Resize, attach parts, or ask ‘add a handle and fillet the edges.’ See changes instantly where it matters."
        bullets={["AR placement & scale", "Voice-guided fixes", "Material & color controls"]}
      />

      <FeatureRow
        eyebrow="From idea to artifact"
        title="Export for print or share"
        copy="Preview in mini VR, then export .STL or .GLB for 3D printing or collaboration."
        bullets={["One-click STL/GLB", "Mini VR inspection", "Versioned model library"]}
      />

      {/* FLOW */}
      <FlowTimeline />

      {/* CTA */}
      <CTA onGoHome={goToHome} onLoadFile={handleLoadFile} />

      <footer className="py-12 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Parametric AR CAD — Built for ideas you can hold.
      </footer>
    </div>
  );
}
