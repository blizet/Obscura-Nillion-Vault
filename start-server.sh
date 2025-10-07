#!/bin/bash

echo "🚀 Starting Nillion Vault Server..."
echo

cd server

echo "📦 Installing dependencies..."
npm install

echo
echo "🔧 Starting server..."
echo "📡 Server will run on http://localhost:3001"
echo "🔑 Make sure to configure your BUILDER_PRIVATE_KEY in .env file"
echo

npm start
