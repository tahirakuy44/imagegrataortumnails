/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { GoogleGenAI } from "@google/genai";
import { Youtube, Wand2, Loader2, Image as ImageIcon, AlertCircle, Palette } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [url, setUrl] = useState("");
  const [backgroundStyle, setBackgroundStyle] = useState("vibrant, modern abstract studio background");
  const [fontStyle, setFontStyle] = useState("bold and cinematic, 3D effect");
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState("");

  const extractVideoId = (link: string) => {
    const match = link.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
    );
    return match ? match[1] : null;
  };

  const handleProcess = async () => {
    try {
      setError("");
      setOriginalImage(null);
      setGeneratedImage(null);

      const videoId = extractVideoId(url);
      if (!videoId) {
        setError("Link YouTube tidak valid. Masukkan URL yang benar.");
        return;
      }

      setLoadingMsg("Mengambil thumbnail dari YouTube...");
      const res = await fetch(`/api/thumbnail?videoId=${videoId}`);
      if (!res.ok) {
        throw new Error("Gagal mengambil thumbnail YouTube");
      }
      const data = await res.json();
      
      const originalImageUrl = `data:${data.mimeType};base64,${data.base64}`;
      setOriginalImage(originalImageUrl);

      setLoadingMsg("AI sedang memproses gambar (ini mungkin memakan waktu)...");
      
      // Initialize Gemini Model
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API Key tidak ditemukan. Pastikan sudah dikonfigurasi.");
      }
      
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [
            {
              inlineData: {
                data: data.base64,
                mimeType: data.mimeType,
              },
            },
            {
              text: `Recreate this thumbnail from scratch. 
1. TEXT: Read the text from the original image. Re-render the EXACT same words, but completely change the typography to match this specific font style: "${fontStyle}". The text must be the primary focus, highly legible, and embody this requested font style perfectly.
2. BACKGROUND & SCENE: Erase all original people, characters, faces, watermarks, and logos. Replace everything behind and around the text with this completely new concept: "${backgroundStyle}". The new background must not conflict with the text readability.`,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
          },
        },
      });

      let foundImage = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const newImageUrl = `data:image/png;base64,${part.inlineData.data}`;
          setGeneratedImage(newImageUrl);
          foundImage = true;
          break;
        }
      }

      if (!foundImage) {
        throw new Error("AI gagal menghasilkan gambar. Silakan coba lagi.");
      }

    } catch (e: any) {
      setError(e.message || "Terjadi kesalahan yang tidak diketahui.");
    } finally {
      setLoadingMsg("");
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-6 md:p-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b editorial-border pb-6 gap-6">
        <div className="flex flex-col">
          <h1 className="font-serif text-4xl md:text-5xl italic tracking-tighter">
            Thumbnail.Remix
          </h1>
          <p className="text-xs uppercase tracking-[0.3em] opacity-50 mt-2">
            Context-Aware Background Synthesis v2.4
          </p>
        </div>
        <div className="flex gap-4 md:gap-8 text-[10px] uppercase tracking-widest opacity-70">
          <span className={!originalImage && !loadingMsg ? "text-white" : "opacity-30"}>01 — Input</span>
          <span className={loadingMsg ? "text-white" : "opacity-30"}>02 — Render</span>
          <span className={generatedImage ? "text-white" : "opacity-30"}>03 — Download</span>
        </div>
      </header>

      <main className="flex-grow grid grid-cols-1 md:grid-cols-12 gap-8">
        <section className="col-span-1 md:col-span-4 flex flex-col gap-6">
          <div className="glass-panel p-6 rounded-sm">
            <label className="text-[10px] uppercase tracking-widest opacity-60 mb-3 block">Source URL</label>
            <div className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="https://youtube.com/watch?v=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="bg-transparent border-b editorial-border py-2 text-sm focus:outline-none focus:border-white transition-colors w-full"
              />
            </div>

            <label className="text-[10px] uppercase tracking-widest opacity-60 mb-3 mt-6 block">Target Style</label>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Contoh: cyberpunk city, solid blue..."
                value={backgroundStyle}
                onChange={(e) => setBackgroundStyle(e.target.value)}
                className="bg-transparent border-b editorial-border py-2 text-sm focus:outline-none focus:border-white transition-colors w-full"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {["cyberpunk city", "solid dark blue", "minimalist white studio", "tropical forest", "neon glow", "cinematic lighting"].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setBackgroundStyle(preset)}
                    className="border border-white/20 px-2 py-1 text-[9px] uppercase tracking-wider rounded-sm hover:bg-white hover:text-black cursor-pointer transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <label className="text-[10px] uppercase tracking-widest opacity-60 mb-3 mt-6 block">Typography / Font Style</label>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Contoh: 3D neon text, elegant serif, bold metallic..."
                value={fontStyle}
                onChange={(e) => setFontStyle(e.target.value)}
                className="bg-transparent border-b editorial-border py-2 text-sm focus:outline-none focus:border-white transition-colors w-full"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {["3D metallic", "elegant serif", "bold cinematic", "neon glow", "cartoonish", "glitch effect"].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setFontStyle(preset)}
                    className="border border-white/20 px-2 py-1 text-[9px] uppercase tracking-wider rounded-sm hover:bg-white hover:text-black cursor-pointer transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleProcess}
              disabled={!!loadingMsg || !url.trim() || !backgroundStyle.trim() || !fontStyle.trim()}
              className="mt-8 w-full bg-white text-black text-[10px] sm:text-xs font-bold uppercase tracking-widest py-3 px-6 hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {loadingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loadingMsg ? "Processing..." : "Render Elements"}
            </button>
          </div>

          <div className="mt-auto mb-4 hidden md:block">
            <p className="text-xs leading-relaxed opacity-60">
              Our neural engine isolates typography and foreground subjects, allowing you to cycle environments without losing the visual hook of your original design.
            </p>
          </div>
        </section>

        <section className="col-span-1 md:col-span-8 flex flex-col">
          <div className="mb-6 flex justify-between items-baseline">
            <h2 className="font-serif text-2xl">Preview Canvas</h2>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 glass-panel border border-red-500/30 text-red-400 rounded-sm flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
            {/* Original Input */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-end">
                <span className="text-[10px] uppercase tracking-widest opacity-50">Original Input</span>
              </div>
              <div className="aspect-video glass-panel rounded-sm overflow-hidden flex items-center justify-center relative">
                {originalImage ? (
                  <img 
                    src={originalImage} 
                    alt="Original Thumbnail" 
                    className="w-full h-full object-contain" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-[10px] uppercase tracking-widest opacity-30">Awaiting Source</span>
                )}
              </div>
            </div>

            {/* Generated Render */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-end">
                <span className="text-[10px] uppercase tracking-widest font-bold">Synthesised Render</span>
                {generatedImage && (
                  <a
                    href={generatedImage}
                    download="thumbnail-generated.png"
                    className="text-[10px] uppercase tracking-widest border border-white/20 hover:bg-white hover:text-black px-3 py-1 rounded transition-colors"
                  >
                    Download
                  </a>
                )}
              </div>
              <div className="aspect-video glass-panel rounded-sm overflow-hidden flex items-center justify-center relative">
                {generatedImage ? (
                  <motion.img 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    src={generatedImage} 
                    alt="Generated Thumbnail" 
                    className="w-full h-full object-contain" 
                    referrerPolicy="no-referrer"
                  />
                ) : loadingMsg ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin opacity-50" />
                    <span className="text-[10px] uppercase tracking-widest opacity-50">Rendering...</span>
                  </div>
                ) : (
                  <span className="text-[10px] uppercase tracking-widest opacity-30">Awaiting Process</span>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-12 flex flex-col sm:flex-row justify-between items-center text-[10px] uppercase tracking-[0.2em] opacity-40 pt-6 border-t editorial-border gap-4">
        <span>System Status: {loadingMsg ? "Processing" : "Ready"}</span>
        <span>Render Engine: v9.42</span>
        <span>© 2026 THUMBNAIL REMIX LABS</span>
      </footer>
    </div>
  );
}
