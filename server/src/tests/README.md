# Knowledge Module Test Script

This directory contains a test script for testing the knowledge module API endpoints using node-fetch.

## Test Script

The `knowledge-module-test.js` script tests the following functionality:
- Authentication via login
- Querying the knowledge base using the `/api/v1/knowledge/query` endpoint

## Prerequisites

Before running the test script, make sure you have the following dependencies installed:

```bash
npm install node-fetch dotenv
```

## Configuration

The test script uses environment variables for configuration. You can set these in a `.env` file in the server root directory or pass them as environment variables when running the script.

Optional environment variables:
- `SERVER_URL` - URL of the server (defaults to http://localhost:3000)
- `TEST_COLLECTION_ID` - UUID of a specific collection to query (optional)

## Running the Test

To run the test script:

```bash
# Make sure you're in the server directory
cd /Users/matt/Learn/js/embeddy/server

# Install dependencies if not already installed
npm install node-fetch dotenv

# Run the test script
node --experimental-modules src/tests/knowledge-module-test.js
```

Note: The `--experimental-modules` flag is needed because the script uses ES modules syntax.

## Expected Output

The script will output:
1. Login status
2. Request details for the knowledge query
3. Response status and data
4. Test results (pass/fail)

If the test passes, you should see:
- "✅ Test passed: Knowledge query endpoint returned success response"
- "✅ Test passed: Response has correct structure"

## Troubleshooting

If you encounter issues:

1. Make sure the server is running
2. Verify your test user credentials are correct
3. Check that the server URL is correct
4. Ensure you have the required dependencies installed
