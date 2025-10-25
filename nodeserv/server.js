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

const api_dir = "http://localhost:5000";
const tmp_dir = path.join(__dirname, 'exports');
await fs.ensureDir(tmp_dir);

const scad = await openscad.createOpenSCAD();

async function compileSCAD(scadCode, format = "stl") {
  const inName = "input.scad";
  const outName = `output.${format}`;

  scad.FS.writeFile(inName, scadCode);

  const args = ["-o", outName, inName];
  const result = scad.callMain(args);
  if (result !== 0) throw new Error(`OpenSCAD exited with code ${result}`);

  const outputData = scad.FS.readFile(outName);
  return outputData;
}

app.post("/generate", async (req, res) => {
  try {
    const { prompt, format = "glb" } = req.body;

    const geomResp = await axios.post(`${PYTHON_API}/generate_scad`, { 'prompt': prompt });
    const ret = geomResp.data;

    const binary = await compileSCAD(ret, format);

    res.setHeader(
      "Content-Type",
      format === "glb" ? "model/gltf-binary" : "application/octet-stream"
    );
    res.send(Buffer.from(binary));
  } catch (err) {
    console.error(err);
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