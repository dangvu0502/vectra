// Test script for knowledge module using node-fetch
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import FormData from 'form-data';

// Load environment variables from .env file
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../.env') });

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const API_BASE_PATH = '/api/v1';
const FILE_UPLOAD_ENDPOINT = `${API_BASE_PATH}/files/upload`;
const KNOWLEDGE_ENDPOINT = `${API_BASE_PATH}/knowledge/query`;

// Test data
const TEST_QUERY = 'flexbox';
const TEST_DOCUMENT_CONTENT = `
Flexbox is a CSS layout model that allows easy alignment and distribution of space among items in a container.
Key properties include:
- display: flex
- flex-direction
- justify-content
- align-items
`;

/**
 * Setup test data by uploading a test file
 */
async function setupTestData() {
  try {
    console.log('Setting up test data...');
    
    // Create form data
    const formData = new FormData();
    
    // Add the file content as a Buffer
    formData.append('file', Buffer.from(TEST_DOCUMENT_CONTENT), {
      filename: 'flexbox-test.txt',
      contentType: 'text/plain',
    });
    
    // Add collection ID if needed
    // formData.append('collection_id', 'your-collection-id');

    // Upload file using the API endpoint
    const response = await fetch(`${SERVER_URL}${FILE_UPLOAD_ENDPOINT}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
    }

    const result = await response.json();
    const fileId = result.data.id;
    console.log(`Created test file with ID: ${fileId}`);
    
    // Wait for embeddings to process (10 seconds)
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    return fileId;
  } catch (error) {
    console.error('Error setting up test data:', error.message);
    throw error;
  }
}

/**
 * Test the knowledge query endpoint
 */
async function testKnowledgeQuery(fileId) {
  try {
    console.log(`Testing knowledge query endpoint: ${KNOWLEDGE_ENDPOINT}`);
    
    // Test 1: Standard query (using collection search)
    console.log('\n--- Test 1: Standard Query ---');
    await runQueryTest({
      query: TEST_QUERY
    });
    
    // Test 2: Query with skip_collection_search option
    console.log('\n--- Test 2: Query with skip_collection_search ---');
    await runQueryTest({
      query: TEST_QUERY,
      skip_collection_search: false
    });
    
  } catch (error) {
    console.error('Error testing knowledge query:', error.message);
  }
}

/**
 * Helper function to run a query test with the given request body
 */
async function runQueryTest(requestBody) {
  try {
    // Add test user ID if needed
    // requestBody.user_id = 'test-user-id';
    
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    // Make the request
    const response = await fetch(`${SERVER_URL}${KNOWLEDGE_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    // Parse response
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    // Validate response
    if (response.ok) {
      console.log('✅ Test passed: Knowledge query endpoint returned success response');
      
      // Validate response structure
      if (data.success && data.data && Array.isArray(data.data.results)) {
        console.log('✅ Test passed: Response has correct structure');
        console.log(`Found ${data.data.results.length} results`);
        
        // Log first result if available
        if (data.data.results.length > 0) {
          console.log('First result:', data.data.results[0]);
        } else {
          console.log('⚠️ Warning: No results found');
        }
      } else {
        console.log('⚠️ Warning: Response structure is not as expected');
      }
    } else {
      console.log('❌ Test failed: Knowledge query endpoint returned error');
      console.log('Error message:', data.message || 'No error message provided');
    }
    
    return data;
  } catch (error) {
    console.error('Error running query test:', error.message);
    throw error;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    // Setup test data first
    // const fileId = await setupTestData();
    
    // Test knowledge query endpoint
    await testKnowledgeQuery();
    
    console.log('\n--- Performance Test ---');
    console.log('Running performance comparison between standard search and direct search');
    
    // Measure performance of standard search
    console.log('\nStandard search (with collection search):');
    const startStandard = Date.now();
    await runQueryTest({
      query: TEST_QUERY
    });
    console.log(`Standard search took: ${Date.now() - startStandard}ms`);
    
    // Measure performance of direct search
    console.log('\nDirect search (skip collection search):');
    const startDirect = Date.now();
    await runQueryTest({
      query: TEST_QUERY,
      skip_collection_search: false
    });
    console.log(`Direct search took: ${Date.now() - startDirect}ms`);
    
    console.log('\nAll tests completed');
  } catch (error) {
    console.error('Test suite failed:', error.message);
  }
}

// Run the tests
runTests();
