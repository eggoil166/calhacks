#!/bin/bash

# Vision Forge API Test Script
echo "🧪 Testing Vision Forge APIs..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test Python API (port 5000)
echo -e "\n${YELLOW}Testing Python API (port 5000)...${NC}"

# Test health check
echo "Testing health check..."
if curl -s http://localhost:5000/api/test | grep -q "working"; then
    echo -e "${GREEN}✅ Python API health check passed${NC}"
else
    echo -e "${RED}❌ Python API health check failed${NC}"
fi

# Test SCAD generation
echo "Testing SCAD generation..."
response=$(curl -s -X POST http://localhost:5000/api/generate_scad \
  -H "Content-Type: application/json" \
  -d '{"prompt": "create a simple cube"}')

if echo "$response" | grep -q "scad_code"; then
    echo -e "${GREEN}✅ Python SCAD generation working${NC}"
else
    echo -e "${RED}❌ Python SCAD generation failed${NC}"
    echo "Response: $response"
fi

# Test Node.js API (port 8080)
echo -e "\n${YELLOW}Testing Node.js API (port 8080)...${NC}"

# Test health check
echo "Testing health check..."
if curl -s http://localhost:8080/ | grep -q "running"; then
    echo -e "${GREEN}✅ Node.js API health check passed${NC}"
else
    echo -e "${RED}❌ Node.js API health check failed${NC}"
fi

# Test STL generation
echo "Testing STL generation..."
response=$(curl -s -X POST http://localhost:8080/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "create a simple cube", "format": "stl"}')

# Check if response is binary (STL file)
if [[ ${#response} -gt 100 ]]; then
    echo -e "${GREEN}✅ Node.js STL generation working${NC}"
else
    echo -e "${RED}❌ Node.js STL generation failed${NC}"
    echo "Response length: ${#response}"
fi

echo -e "\n${YELLOW}API Test Complete!${NC}"
echo "If any tests failed, make sure both servers are running:"
echo "  Python: python app.py"
echo "  Node.js: cd nodeserv && node server.js"
