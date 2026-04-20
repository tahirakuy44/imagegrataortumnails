import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API to fetch YouTube thumbnail and convert it to base64
  app.get("/api/thumbnail", async (req, res) => {
    const { videoId } = req.query;
    if (!videoId || typeof videoId !== "string") {
      return res.status(400).json({ error: "Missing videoId" });
    }

    try {
      const urls = [
        `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        `https://img.youtube.com/vi/${videoId}/default.jpg`,
      ];
      
      let imageResponse = null;
      for (const url of urls) {
        imageResponse = await fetch(url);
        if (imageResponse.ok) break;
      }

      if (!imageResponse || !imageResponse.ok) {
        return res.status(404).json({ error: "Failed to fetch thumbnail" });
      }

      const buffer = await imageResponse.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";
      
      res.json({ base64, mimeType });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal server error fetching thumbnail" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
