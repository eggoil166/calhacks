import express from "express";
import axios from "axios";
import fs from  "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import * as openscad from "openscad-wasm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

const api_dir = "http://localhost:5000";
const tmp_dir = path.join(__dirname, 'exports');
await fs.ensureDir(tmp_dir);

// Initialize OpenSCAD
let scad;
try {
  scad = await openscad.createOpenSCAD();
  console.log("OpenSCAD initialized successfully");
} catch (error) {
  console.error("Failed to initialize OpenSCAD:", error);
  throw error;
}

async function compileSCAD(scadCode, format = "stl") {
  try {
    console.log("Attempting to compile SCAD code...");
    console.log("Available methods:", Object.keys(scad));
    
    // Use the correct OpenSCAD WASM API
    if (scad.renderToStl) {
      // Direct render to STL
      const stlData = await scad.renderToStl(scadCode);
      return stlData;
    } else if (scad.getInstance) {
      // Get instance and use FS API
      const instance = await scad.getInstance();
      if (instance.FS && instance.FS.writeFile) {
        const inName = "input.scad";
        const outName = `output.${format}`;
        
        instance.FS.writeFile(inName, scadCode);
        const args = ["-o", outName, inName];
        const result = instance.callMain(args);
        if (result !== 0) throw new Error(`OpenSCAD exited with code ${result}`);
        const outputData = instance.FS.readFile(outName);
        return outputData;
      }
    }
    
    throw new Error("OpenSCAD API not supported");
  } catch (error) {
    console.error("OpenSCAD compilation error:", error);
    throw new Error(`OpenSCAD compilation failed: ${error.message}`);
  }
}

app.post("/generate", async (req, res) => {
  try {
    const { prompt, format = "stl" } = req.body;

    const geomResp = await axios.post(`${api_dir}/api/generate_scad`, { 'prompt': prompt });
    const ret = geomResp.data;
    
    // Extract the SCAD code from the response
    const scadCode = ret.scad_code || ret;
    console.log("Received SCAD code:", scadCode);

    const binary = await compileSCAD(scadCode, format);

    res.setHeader(
      "Content-Type",
      format === "glb" ? "model/gltf-binary" : "application/octet-stream"
    );
    res.send(Buffer.from(binary));
  } catch (err) {
    console.error("Error in /generate:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("OpenSCAD-WASM Node server is running");
});

const PORT = 8080;
app.listen(PORT, () =>
  console.log(`Node server (WASM) listening on port ${PORT}`)
);
