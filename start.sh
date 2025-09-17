#!/bin/bash

echo "🏥 Starting Health Monitor Dashboard..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🚀 Starting server..."
echo ""
echo "📊 Dashboard will be available at: http://localhost:3000"
echo "👨‍⚕️ Doctor dashboard example: http://localhost:3000/doctor/[session-id]"
echo "🧪 Test page available at: http://localhost:3000/test.html"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
node server.js