# Vision Forge API - Postman Collections

## 📁 Files Created

### Collections
- **`Vision_Forge_Node_API.postman_collection.json`** - Node.js API endpoints (port 8080)
- **`Vision_Forge_Python_API.postman_collection.json`** - Python Flask API endpoints (port 5000)  
- **`Vision_Forge_Complete_API.postman_collection.json`** - Combined collection with workflow examples

### Environment & Testing
- **`Vision_Forge_Environment.postman_environment.json`** - Environment variables
- **`test_apis.sh`** - Automated API testing script
- **`README.md`** - Detailed setup and usage instructions

## 🚀 Quick Start

1. **Import Collections**: Import all `.postman_collection.json` files into Postman
2. **Import Environment**: Import `Vision_Forge_Environment.postman_environment.json`
3. **Set API Key**: Update `claude_api_key` in the environment
4. **Start Servers**: Run both Python and Node.js servers
5. **Test**: Run `./test_apis.sh` to verify everything works

## ✅ API Status

Both APIs are currently **WORKING** and tested:

- ✅ Python API (port 5000) - Health check passed
- ✅ Python API - SCAD generation working  
- ✅ Node.js API (port 8080) - Health check passed
- ✅ Node.js API - STL generation working

## 🔧 Available Endpoints

### Python API (Flask - Port 5000)
- `GET /api/test` - Health check
- `POST /api/generate_scad` - Generate SCAD code from prompt
- `POST /edit_scad` - Edit existing SCAD code
- `POST /api/text-to-speech` - Convert text to MP3 audio
- `POST /api/claude/flash` - Direct Claude AI API call

### Node.js API (Express - Port 8080)  
- `GET /` - Health check
- `POST /generate` - Generate STL/GLB from prompt
- `POST /edit` - Edit existing SCAD model

## 📋 Example Workflows

### Complete Workflow (Generate → Compile → Audio)
1. Generate SCAD code via Python API
2. Compile to STL via Node.js API  
3. Generate audio description via Python API

### Individual Testing
- Test each endpoint independently
- Use the "Individual Endpoints" folder for isolated testing
- Use the "Complete Workflow Examples" for end-to-end testing

## 🎯 Key Features

- **Environment Variables**: Easy switching between dev/prod URLs
- **Workflow Examples**: Pre-built complete workflows
- **Health Checks**: Quick API status verification
- **Binary Responses**: STL/GLB files download automatically
- **Audio Responses**: MP3 files play in Postman viewer
- **Error Handling**: Proper error responses and status codes

## 🔍 Testing Results

All APIs tested successfully:
- Python Flask server responding correctly
- Node.js Express server responding correctly  
- SCAD code generation working
- STL file compilation working
- CORS properly configured
- Binary file responses working

The Postman collections are ready for immediate use! 🎉
