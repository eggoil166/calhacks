import express from "express";
import axios from "axios";
import fs from  "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import * as openscad from "openscad-wasm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "50mb" }));

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

const api_dir = "http://127.0.0.1:5000";
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
    
    // Use getInstance method which is more reliable
    const instance = await scad.getInstance();
    console.log("OpenSCAD instance created");
    
    if (!instance.FS) {
      throw new Error("OpenSCAD FS not available");
    }
    
    const inName = "input.scad";
    const outName = `output.${format}`;
    
    // Write input file
    instance.FS.writeFile(inName, scadCode);
    console.log("SCAD file written to filesystem");
    
    // Compile
    const args = ["-o", outName, inName];
    console.log("Running OpenSCAD with args:", args);
    const result = instance.callMain(args);
    
    console.log("OpenSCAD callMain result:", result);
    
    // Check if output file exists regardless of return code
    try {
      const outputData = instance.FS.readFile(outName);
      console.log("Output data length:", outputData.length);
      
      if (outputData.length > 0) {
        console.log("OpenSCAD compilation successful - file generated");
        return outputData;
      }
    } catch (readError) {
      console.log("Could not read output file:", readError.message);
    }
    
    // If we get here, compilation failed - provide detailed error info
    const errorMsg = result === 0 ? "No output file generated" : `OpenSCAD compilation failed with exit code ${result}`;
    console.error("OpenSCAD compilation failed:", errorMsg);
    throw new Error(errorMsg);
  } catch (error) {
    console.error("OpenSCAD compilation error:", error);
    // Ensure we always have a meaningful error message
    const errorMessage = error.message || "Unknown OpenSCAD compilation error";
    throw new Error(`OpenSCAD compilation failed: ${errorMessage}`);
  }
}

app.post("/generate", async (req, res) => {
  try {
    const { prompt, format = "stl" } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const geomResp = await axios.post(`${api_dir}/api/generate_scad`, { 'prompt': prompt });
    const ret = geomResp.data;
    
    // Extract the SCAD code from the response
    const scadCode = ret.scad_code || ret;
    console.log("Received SCAD code:", scadCode);

    if (!scadCode) {
      return res.status(400).json({ error: "No SCAD code received from backend" });
    }

    const binary = await compileSCAD(scadCode, format);

    res.setHeader(
      "Content-Type",
      format === "stl" ? "application/sla" : "application/octet-stream"
    );
    res.send(Buffer.from(binary));
  } catch (err) {
    console.error("Error in /generate:", err);
    // Ensure we always return a proper error message
    const errorMessage = err.message || "Unknown server error";
    res.status(500).json({ error: errorMessage });
  }
});

app.get("/", (req, res) => {
  res.send("OpenSCAD-WASM Node server is running");
});

const PORT = 8080;
app.listen(PORT, () =>
  console.log(`Node server (WASM) listening on port ${PORT}`)
);
