import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Box, Download, RotateCcw } from "lucide-react";
import STLPlaneViewer from "../components/STLPlaneViewer";
import { editModel } from "../lib/apicalls";
import { xcallClaudeFlash } from "../lib/api";

const STLPlanePage: React.FC = () => {
  const [stlUrl, setStlUrl] = useState<string>("");
  const [stlBuffer, setStlBuffer] = useState<ArrayBuffer | null>(null);
  const [editPrompt, setEditPrompt] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [ttsTranscript, setTtsTranscript] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const playDescriptionAudio = useCallback(async (description: string) => {
    try {
      setTtsTranscript(description);
      const audioBlob = await textToSpeech(description);
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      const audio = new Audio(url);
      audio.play();
    } catch (err) {
      console.error('TTS playback failed:', err);
    }
  }, []);


  const handleEdit = async (prompt: string) => {
    try {
      setIsEditing(true);
      const result = await editModel(prompt);
      const xcall = await xcallClaudeFlash(prompt);
      if (result.description && result.description.trim()) {
        await playDescriptionAudio(result.description);
      }

      console.log("✅ STL file received:", result.fileName);

      const blob = new Blob([result.stlBuffer], { type: "model/stl" });
      const url = URL.createObjectURL(blob);
      setStlUrl(url);
      setStlBuffer(result.stlBuffer);

      // Optionally persist for reload
      sessionStorage.setItem("generatedSTLUrl", url);
      sessionStorage.setItem(
        "generatedSTLBuffer",
        JSON.stringify(Array.from(new Uint8Array(result.stlBuffer)))
      );
    } catch (error) {
      console.error("❌ Error editing model:", error);
    } finally {
      setIsEditing(false);
    }
  };

  useEffect(() => {
    const generatedUrl = sessionStorage.getItem("generatedSTLUrl");
    const generatedBuffer = sessionStorage.getItem("generatedSTLBuffer");

    if (generatedUrl) {
      setStlUrl(generatedUrl);
      console.log("Loaded generated STL URL:", generatedUrl);
    }

    if (generatedBuffer) {
      try {
        const bufferArray = JSON.parse(generatedBuffer);
        const buffer = new Uint8Array(bufferArray).buffer;
        setStlBuffer(buffer);
        console.log("Loaded generated STL buffer:", buffer.byteLength, "bytes");
      } catch (error) {
        console.error("Failed to parse generated STL buffer:", error);
      }
    }
  }, []);

  const handleSTLLoaded = (geometry: THREE.BufferGeometry) => {
    console.log("STL loaded successfully:", geometry);
  };

  const handleReset = () => {
    setStlUrl("");
    setStlBuffer(null);
    sessionStorage.removeItem("generatedSTLUrl");
    sessionStorage.removeItem("generatedSTLBuffer");
  };

  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Background Effects */}
      <div className="pointer-events-none fixed inset-0">
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 h-[40rem] w-[40rem] rounded-full blur-3xl opacity-10"
          style={{
            background:
              "radial-gradient(closest-side, var(--accent-primary), var(--accent-secondary), transparent 60%)",
          }}
        />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="sticky top-0 z-50 tech-glass"
          style={{
            background: "var(--bg-glass)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid var(--border-primary)",
          }}
        >
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleGoBack}
                className="flex items-center gap-2 px-3 py-2 rounded-xl font-medium transition-all duration-200 tech-border"
                style={{
                  background: "var(--bg-card)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-secondary)",
                }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center tech-glow animate-pulse-glow"
                style={{
                  background:
                    "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                  boxShadow: "var(--shadow-glow)",
                }}
              >
                <Box className="h-5 w-5 text-white" />
              </div>
              <h1
                className="text-2xl font-bold"
                style={{
                  background:
                    "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                STL 3D Viewer
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {stlUrl && (
                <a
                  href={stlUrl}
                  download
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 tech-glow"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                    color: "var(--text-primary)",
                    boxShadow: "var(--shadow-glow)",
                  }}
                >
                  <Download className="w-4 h-4" />
                  Download STL
                </a>
              )}
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 tech-border"
                style={{
                  background: "var(--bg-card)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-secondary)",
                }}
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>
          </div>
        </motion.header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Viewer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-6xl mx-auto"
          >
            <div className="tech-glass rounded-3xl shadow-2xl overflow-hidden tech-border">
              <div
                className="flex items-center justify-between px-6 py-4 border-b tech-border"
                style={{ background: "var(--bg-card)" }}
              >
                <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                  {stlUrl ? "Generated STL Model" : "STL Viewer"}
                </h3>
              </div>

              <div className="p-6">
                <STLPlaneViewer
                  src={stlUrl}
                  stlBuffer={stlBuffer}
                  width={800}
                  height={600}
                  color="#10b981"
                  backgroundColor="#f8fafc"
                  showUpload={true}
                  onSTLLoaded={handleSTLLoaded}
                />
              </div>
            </div>
          </motion.div>

          {/* 🔧 Edit Model Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 max-w-3xl mx-auto tech-glass rounded-2xl p-6 tech-border"
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              Request an Edit
            </h3>
            <textarea
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder="Describe your desired changes to the model (e.g., 'Make the cylinder taller and add holes on top')."
              className="w-full p-3 rounded-xl border text-sm focus:outline-none"
              style={{
                borderColor: "var(--border-secondary)",
                background: "var(--bg-card)",
                color: "var(--text-primary)",
              }}
              rows={3}
            />
            <button
              onClick={() => handleEdit(editPrompt)}
              disabled={isEditing || !editPrompt.trim()}
              className="mt-4 px-6 py-2 rounded-xl font-medium transition-all duration-200 tech-glow"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                color: "white",
                opacity: isEditing ? 0.6 : 1,
              }}
            >
              {isEditing ? "Processing..." : "Submit Edit"}
            </button>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default STLPlanePage;
