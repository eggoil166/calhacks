import type { CADParameter } from './types';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export async function xcallClaudeFlash(payload: string): Promise<{scad_code: string, description: string}> {
  console.log("payload", payload)
  const response = await fetch(`http://127.0.0.1:5000/api/generate_scad`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: payload })
  });
  
  if (!response.ok) {
    throw new Error(`Claude flash failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  console.log("Response data:", data);
  return data;
}

export async function textToSpeech(text: string): Promise<Blob> {
  const response = await fetch(`http://127.0.0.1:5000/api/text-to-speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text })
  });
  console.log(response);
  if (!response.ok) {
    throw new Error(`Text-to-speech failed: ${response.statusText}`);
  }
  
  return await response.blob();
}

export interface NLPToCADRequest {
  prompt: string;
}

export interface NLPToCADResponse {
  title: string;
  units: string;
  cadLanguage: string;
  parameters: CADParameter[];
  modelId: string;
}

export interface CADToMeshRequest {
  modelId: string;
  parameters: Record<string, number>;
}

export interface CADToMeshResponse {
  glbUrl: string;
  usdzUrl: string;
  stlUrl: string;
  meta: {
    bbox: number[];
    volume_mm3: number;
    manifold: boolean;
    minWall_mm: number;
    warnings: string[];
  };
}

export async function nlpToCAD(prompt: string): Promise<NLPToCADResponse> {
  const mockFlag = import.meta.env.VITE_MOCK_MODE as string | undefined;
  const preferMock = mockFlag === undefined ? true : mockFlag === 'true';

  const mockResponse: NLPToCADResponse = {
    title: "Adjustable L-Bracket",
    units: "mm",
    cadLanguage: "openscad",
    parameters: [
      { name: "arm_a", label: "Arm A Length", unit: "mm", type: "number", default: 80, min: 20, max: 300, step: 1 },
      { name: "arm_b", label: "Arm B Length", unit: "mm", type: "number", default: 80, min: 20, max: 300, step: 1 },
      { name: "thickness", label: "Thickness", unit: "mm", type: "number", default: 5, min: 2, max: 20, step: 0.5 },
      { name: "hole_d", label: "Hole Diameter", unit: "mm", type: "number", default: 6, min: 3, max: 20, step: 0.5 },
      { name: "hole_pitch", label: "Hole Pitch", unit: "mm", type: "number", default: 20, min: 10, max: 100, step: 1 },
      { name: "fillet_r", label: "Corner Radius", unit: "mm", type: "number", default: 4, min: 0, max: 20, step: 1 }
    ],
    modelId: 'mock-model-' + Date.now()
  };

  if (preferMock) {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockResponse;
  }

  try {
    const response = await fetch(`${API_BASE}/nlp-to-cad`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    if (!response.ok) throw new Error(response.statusText);
    return await response.json();
  } catch (err) {
    console.warn('nlpToCAD failed, falling back to mock:', err);
    return mockResponse;
  }
}

export async function cadToMesh(modelId: string, parameters: Record<string, number>): Promise<CADToMeshResponse> {
  const mockFlag = import.meta.env.VITE_MOCK_MODE as string | undefined;
  const preferMock = mockFlag === undefined ? true : mockFlag === 'true';

  const mockResponse: CADToMeshResponse = {
    glbUrl: "https://modelviewer.dev/shared-assets/models/NeilArmstrong.glb",
    usdzUrl: "https://modelviewer.dev/shared-assets/models/Astronaut.usdz",
    stlUrl: "",
    meta: {
      bbox: [0, 0, 0, 0.08, 0.08, 0.005],
      volume_mm3: 123456,
      manifold: true,
      minWall_mm: 4.8,
      warnings: []
    }
  };

  if (preferMock) {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockResponse;
  }

  try {
    const response = await fetch(`${API_BASE}/cad-to-mesh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId, parameters })
    });
    if (!response.ok) throw new Error(response.statusText);
    return await response.json();
  } catch (err) {
    console.warn('cadToMesh failed, falling back to mock:', err);
    return mockResponse;
  }
}
