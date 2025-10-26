import express from "express";
import axios from "axios";
import fs from  "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "50mb" }));

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

const api_dir = "http://127.0.0.1:5000";
const tmp_dir = path.join(__dirname, 'exports');
await fs.ensureDir(tmp_dir);

// Initialize OpenSCAD - using system OpenSCAD instead of WASM
let scad;
try {
  // Test if OpenSCAD is available
  await execAsync("openscad --version");
  console.log("OpenSCAD system binary initialized successfully");
  scad = true; // Just mark as available
} catch (error) {
  console.error("Failed to initialize OpenSCAD:", error);
  throw error;
}

async function compileSCAD(scadCode, format = "stl") {
  try {
    console.log("Attempting to compile SCAD code...");
    
    const inputFile = path.join(tmp_dir, `input_${Date.now()}.scad`);
    const outputFile = path.join(tmp_dir, `output_${Date.now()}.${format}`);
    
    // Write SCAD code to file
    await fs.writeFile(inputFile, scadCode);
    console.log("SCAD file written to:", inputFile);
    
    // Compile using system OpenSCAD
    const command = `openscad -o "${outputFile}" "${inputFile}"`;
    console.log("Running command:", command);
    
    const { stdout, stderr } = await execAsync(command);
    console.log("OpenSCAD stdout:", stdout);
    if (stderr) console.log("OpenSCAD stderr:", stderr);
    
    // Read the output file
    const outputData = await fs.readFile(outputFile);
    console.log("Output data length:", outputData.length);
    
    if (outputData.length > 0) {
      console.log("OpenSCAD compilation successful - file generated");
      
      // Clean up temporary files
      await fs.remove(inputFile).catch(() => {});
      await fs.remove(outputFile).catch(() => {});
      
      return outputData;
    } else {
      throw new Error("No output file generated");
    }
  } catch (error) {
    console.error("OpenSCAD compilation error:", error);
    const errorMessage = error.message || "Unknown OpenSCAD compilation error";
    throw new Error(`OpenSCAD compilation failed: ${errorMessage}`);
  }
}

app.post("/edit", async (req, res) => {
  try {
    const { edit_request, historical_text, current_scad } = req.body;
    const geomResp = await axios.post(`${api_dir}/api/edit_scad`, { 'edit_request': edit_request, 'historical_text': historical_text, 'current_scad': current_scad });
    const ret = geomResp.data;
    let scadCode = ret.scad_code || ret;
    if (typeof scadCode === 'string' && scadCode.includes('module ')) {
      // Find the first occurrence of 'module ' and extract everything from there
      const moduleIndex = scadCode.indexOf('module ');
      if (moduleIndex !== -1) {
        scadCode = scadCode.substring(moduleIndex);
      }
    }
    
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
})

app.post("/generate", async (req, res) => {
  try {
    const { prompt, format = "stl" } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const geomResp = await axios.post(`${api_dir}/api/generate_scad`, { 'prompt': prompt });
    const ret = geomResp.data;
    
    // Extract the SCAD code from the response
    let scadCode = ret.scad_code || ret;
    
    // If the SCAD code includes a description, extract just the OpenSCAD code
    if (typeof scadCode === 'string' && scadCode.includes('module ')) {
      // Find the first occurrence of 'module ' and extract everything from there
      const moduleIndex = scadCode.indexOf('module ');
      if (moduleIndex !== -1) {
        scadCode = scadCode.substring(moduleIndex);
      }
    }
    
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
