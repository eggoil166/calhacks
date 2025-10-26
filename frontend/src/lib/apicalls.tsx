export async function callClaudeFlash(requestText: string, contextText: string): Promise<{stlBuffer: ArrayBuffer, fileName: string}> {
  const res = await fetch('http://localhost:8080/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: requestText + "\n" + contextText })
  });
  
  if (!res.ok) {
    // Clone the response to read text without consuming the body
    const clonedRes = res.clone();
    const msg = await safeReadText(clonedRes);
    throw new Error(`Flash call failed: ${res.status} ${res.statusText}${msg ? ` - ${msg}` : ''}`);
  }

  // Check if response is binary data (STL or GLB)
  const contentType = res.headers.get('content-type');
  
  if (contentType?.includes('application/octet-stream') || 
      contentType?.includes('model/gltf-binary') ||
      contentType?.includes('application/sla') ||
      contentType?.includes('application/stl')) {
    // Handle binary response (STL or GLB)
    const arrayBuffer = await res.arrayBuffer();
    const fileName = res.headers.get('content-disposition')?.match(/filename="(.+)"/)?.[1] || 'model.stl';
    
    return {
      stlBuffer: arrayBuffer,
      fileName: fileName
    };
  } else {
    // Handle JSON response (fallback)
    const data = await res.json().catch(async () => ({ output: await res.text() }));
    throw new Error(`Expected binary file but received: ${contentType}. Response: ${JSON.stringify(data)}`);
  }
}

async function safeReadText(res: Response): Promise<string> {
  try { return await res.text(); } catch { return ''; }
}

// Additional helper function to handle the GLB buffer
export function saveGLBFile(glbBuffer: ArrayBuffer, fileName: string = 'model.glb'): void {
  // Create blob and download link
  const blob = new Blob([glbBuffer], { type: 'model/gltf-binary' });
  const url = URL.createObjectURL(blob);
  
  // Create download link
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  // Clean up URL
  URL.revokeObjectURL(url);
}

// Alternative function that returns a Blob for direct use
export function getGLBBlob(glbBuffer: ArrayBuffer): Blob {
  return new Blob([glbBuffer], { type: 'model/gltf-binary' });
}

// Usage example:
/*
async function generateAndDownloadModel() {
  try {
    const result = await callClaudeFlash("Create a cube", "Basic shape");
    saveGLBFile(result.glbBuffer, result.fileName);
  } catch (error) {
    console.error('Error:', error);
  }
}
*/
