import { VectorStore } from '@/types';

export const mockVectorStores: VectorStore[] = [
  {
    id: 'vs_01HQ2X5J6N8K9M3P4R5T6Y7U8',
    name: 'Technical Documentation',
    description: 'Contains API documentation, code samples, and technical guides',
    documentCount: 15,
    lastUpdated: '2024-02-15T08:30:00Z',
    documents: [
      {
        id: 'doc_01HQ2X5J6N8K9M3P4R5T6Y7U9',
        name: 'API Reference Guide.pdf',
        type: 'pdf',
        size: '2.5MB',
        tokens: 3500,
        language: 'en',
        createdAt: '2024-02-10T14:20:00Z',
        status: 'ready'
      },
      {
        id: 'doc_01HQ2X5J6N8K9M3P4R5T6Y7UA',
        name: 'Implementation Examples.tsx',
        type: 'code',
        size: '45KB',
        tokens: 1200,
        language: 'typescript',
        createdAt: '2024-02-12T09:15:00Z',
        status: 'ready'
      }
    ]
  },
  {
    id: 'vs_01HQ2X5J6N8K9M3P4R5T6Y7UB',
    name: 'Research Papers',
    description: 'Academic papers and research documents',
    documentCount: 8,
    lastUpdated: '2024-02-14T16:45:00Z',
    documents: [
      {
        id: 'doc_01HQ2X5J6N8K9M3P4R5T6Y7UC',
        name: 'Machine Learning Survey.pdf',
        type: 'pdf',
        size: '4.2MB',
        tokens: 5800,
        language: 'en',
        createdAt: '2024-02-13T11:30:00Z',
        status: 'ready'
      },
      {
        id: 'doc_01HQ2X5J6N8K9M3P4R5T6Y7UD',
        name: 'Data Analysis Results.txt',
        type: 'text',
        size: '120KB',
        tokens: 2500,
        language: 'en',
        createdAt: '2024-02-14T15:45:00Z',
        status: 'processing'
      }
    ]
  },
  {
    id: 'vs_01HQ2X5J6N8K9M3P4R5T6Y7UE',
    name: 'Project Documentation',
    description: 'Internal project documentation and guidelines',
    documentCount: 12,
    lastUpdated: '2024-02-13T13:20:00Z',
    documents: [
      {
        id: 'doc_01HQ2X5J6N8K9M3P4R5T6Y7UF',
        name: 'Project Overview.md',
        type: 'text',
        size: '80KB',
        tokens: 1800,
        language: 'en',
        createdAt: '2024-02-11T10:00:00Z',
        status: 'ready'
      },
      {
        id: 'doc_01HQ2X5J6N8K9M3P4R5T6Y7UG',
        name: 'Architecture Diagram.svg',
        type: 'image',
        size: '250KB',
        tokens: 0,
        language: 'en',
        createdAt: '2024-02-13T12:30:00Z',
        status: 'error'
      }
    ]
  }
];