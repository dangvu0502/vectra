import { EmbeddingService } from './index';
import type { Document } from '../document';
import { promises as fs } from 'fs';
import path from 'path';

async function demonstrateRAG() {
  // Initialize the service with specific configuration
  const embeddingService = new EmbeddingService({
    model: 'text-embedding-3-small',
    dimensions: 384,
    chunkSize: 500,  // Smaller chunks for more granular matching
    overlapSize: 100 // Overlap to maintain context between chunks
  });

  // Multiple documents with different topics
  const documents: Document[] = [
    {
      id: 'doc-1',
      filename: 'typescript-intro.txt',
      path: '/samples/typescript-intro.txt',
      content: `
        TypeScript is a programming language developed and maintained by Microsoft. 
        It is a strict syntactical superset of JavaScript and adds optional static typing to the language.
        TypeScript is designed for the development of large applications and transcompiles to JavaScript.
        As it is a superset of JavaScript, existing JavaScript programs are also valid TypeScript programs.
        TypeScript adds optional types, classes, and modules to JavaScript, enabling developers to write more maintainable code.
      `,
      createdAt: new Date(),
      metadata: {
        author: 'Microsoft Team',
        category: 'Programming Languages',
        tags: ['typescript', 'javascript', 'programming']
      }
    },
    {
      id: 'doc-2',
      filename: 'react-concepts.txt',
      path: '/samples/react-concepts.txt',
      content: `
        React is a JavaScript library for building user interfaces, particularly single-page applications.
        It enables developers to create reusable UI components that manage their own state.
        React uses a virtual DOM to optimize rendering performance.
        The key concepts in React include components, props, state, and hooks.
        React was developed by Facebook and is now maintained by both Facebook and the open source community.
      `,
      createdAt: new Date(),
      metadata: {
        author: 'React Team',
        category: 'Frontend Frameworks',
        tags: ['react', 'javascript', 'frontend']
      }
    },
    {
      id: 'doc-3',
      filename: 'node-basics.txt',
      path: '/samples/node-basics.txt',
      content: `
        Node.js is a JavaScript runtime built on Chrome's V8 JavaScript engine.
        It allows developers to run JavaScript on the server side.
        Node.js uses an event-driven, non-blocking I/O model that makes it lightweight and efficient.
        The Node Package Manager (npm) is the largest ecosystem of open source libraries in the world.
        Node.js is particularly well-suited for building scalable network applications.
      `,
      createdAt: new Date(),
      metadata: {
        author: 'Node.js Foundation',
        category: 'Backend Technologies',
        tags: ['nodejs', 'javascript', 'backend']
      }
    }
  ];

  try {
    // Embed all documents
    console.log('Embedding documents...');
    const embeddingResults = await Promise.all(
      documents.map(doc => embeddingService.embedDocument(doc))
    );

    console.log('\nEmbedding Statistics:');
    embeddingResults.forEach((result, index) => {
      console.log(`Document ${index + 1}: ${result.chunks.length} chunks`);
    });

    // Perform various searches
    const searches = [
      {
        query: 'What is TypeScript and how does it relate to JavaScript?',
        context: 'Looking for TypeScript basics',
        threshold: 0.5  // Lower threshold from 0.7
      },
      {
        query: 'Explain React virtual DOM and performance',
        context: 'Interested in React performance',
        threshold: 0.5  // Lower threshold from 0.75
      },
      {
        query: 'Tell me about Node.js performance and architecture',
        context: 'Backend performance characteristics',
        threshold: 0.5  // Lower threshold from 0.8
      },
      {
        query: 'JavaScript ecosystem and web development',
        context: 'Full-stack development',
        threshold: 0.5  // Keep lower threshold for broader matches
      }
    ];

    // Execute searches and analyze results
    console.log('\nPerforming searches...');
    for (const search of searches) {
      console.log(`\n--- Search: ${search.context} ---`);
      console.log(`Query: ${search.query}`);
      
      const searchResults = await embeddingService.searchSimilar(
        search.query,
        { 
          limit: 3, 
          threshold: search.threshold,
        }
      );

      if (searchResults.length === 0) {
        console.log('No relevant results found.');
        continue;
      }

      searchResults.forEach((result, index) => {
        const score = result.score || 0;
        console.log(`\nResult ${index + 1} (Score: ${score.toFixed(4)}):`);
        console.log(`Text: ${result.text.trim()}`);
        console.log(`Source: ${result.metadata.documentId}`);
        const sourceDoc = documents.find(d => d.id === result.metadata.documentId);
        console.log(`Category: ${sourceDoc?.metadata.category}`);
        console.log(`Tags: ${sourceDoc?.metadata.tags.join(', ')}`);
      });
    }

    // Generate a summary report
    console.log('\n=== Search Analysis Report ===');
    console.log('Documents processed:', documents.length);
    console.log('Total chunks:', embeddingResults.reduce((sum, r) => sum + r.chunks.length, 0));
    console.log('Searches performed:', searches.length);

  } catch (error) {
    console.error('Error during RAG demonstration:', error);
  }
}

// Run the demonstration
demonstrateRAG().catch(console.error);