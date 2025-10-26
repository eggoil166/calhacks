# Vision Forge API - Postman Collections

This directory contains Postman collections for testing the Vision Forge APIs.

## Files

- `Vision_Forge_Node_API.postman_collection.json` - Node.js API collection (port 8080)
- `Vision_Forge_Python_API.postman_collection.json` - Python Flask API collection (port 5000)
- `Vision_Forge_Environment.postman_environment.json` - Environment variables

## Setup Instructions

### 1. Import Collections into Postman

1. Open Postman
2. Click "Import" button
3. Select the two collection JSON files:
   - `Vision_Forge_Node_API.postman_collection.json`
   - `Vision_Forge_Python_API.postman_collection.json`
4. Import the environment file: `Vision_Forge_Environment.postman_environment.json`

### 2. Configure Environment

1. In Postman, go to Environments
2. Select "Vision Forge Environment"
3. Update the `claude_api_key` variable with your actual Claude API key
4. Verify the base URLs are correct for your setup

### 3. Start Your Servers

Make sure both servers are running:

```bash
# Terminal 1 - Python Flask Server (port 5000)
cd /home/samanthabrown/Calhacks/calhak
python app.py

# Terminal 2 - Node.js Server (port 8080)
cd /home/samanthabrown/Calhacks/calhak/nodeserv
node server.js
```

## API Endpoints Overview

### Node.js API (Port 8080)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/generate` | POST | Generate STL/GLB from prompt |
| `/edit` | POST | Edit existing SCAD model |

### Python API (Port 5000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/test` | GET | Health check |
| `/api/generate_scad` | POST | Generate SCAD code from prompt |
| `/edit_scad` | POST | Edit existing SCAD code |
| `/api/text-to-speech` | POST | Convert text to speech (MP3) |
| `/api/claude/flash` | POST | Direct Claude AI API call |

## Example Requests

### Generate STL File (Node.js)
```json
POST http://localhost:8080/generate
{
  "prompt": "create a simple cube with dimensions 20x20x20mm",
  "format": "stl"
}
```

### Generate SCAD Code (Python)
```json
POST http://localhost:5000/api/generate_scad
{
  "prompt": "create a simple cube with dimensions 20x20x20mm"
}
```

### Text to Speech (Python)
```json
POST http://localhost:5000/api/text-to-speech
{
  "text": "Hello, this is a test of the text to speech functionality."
}
```

## Response Types

- **STL/GLB Generation**: Returns binary data (STL or GLB files)
- **SCAD Code Generation**: Returns JSON with `scad_code` and `description`
- **Text to Speech**: Returns MP3 audio file
- **Health Checks**: Returns JSON with status message

## Troubleshooting

1. **CORS Errors**: Both servers have CORS enabled for localhost:5173/5174
2. **OpenSCAD Not Found**: Make sure OpenSCAD is installed on your system
3. **Claude API Key**: Ensure your Claude API key is set in the environment
4. **Port Conflicts**: Check that ports 5000 and 8080 are available

## Notes

- The Node.js server compiles SCAD code to STL/GLB using system OpenSCAD
- The Python server handles AI generation and text-to-speech
- Binary responses (STL/GLB) will download as files in Postman
- Audio responses (MP3) will play in Postman's response viewer
