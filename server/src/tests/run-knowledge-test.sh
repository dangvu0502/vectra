#!/bin/bash

# Script to run the knowledge module test

# Change to the tests directory
cd "$(dirname "$0")"

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Copy .env.example to .env if .env doesn't exist
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  echo "Creating .env file from .env.example..."
  cp .env.example .env
  echo "Please update the .env file with your test credentials before running the test."
  exit 1
fi

# Run the test
echo "Running knowledge module test..."
npm run test:knowledge

echo "Test completed."
