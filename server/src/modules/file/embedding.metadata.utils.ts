import path from 'path';
// Import MDocument to potentially use its type or related types
import { MDocument } from '@mastra/rag'; // Keep for context, but not for Chunk type

// Revert Chunk type to the structure implied by usage
type Chunk = {
  text: string;
  metadata?: Record<string, any>;
};

// Type for heading information
type HeadingInfo = {
  title: string;
  index: number;
};

/**
 * Parses Markdown headings (## or more) from content.
 * @param content The text content to parse.
 * @returns Array of heading titles and their starting indices.
 */
function parseHeadings(content: string): HeadingInfo[] {
  const headings: HeadingInfo[] = [];
  const headingRegex = /^(#{2,})\s+(.*)/gm; // Match lines starting with ##, ###, etc.
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    headings.push({
      title: match[2].trim(), // The heading text
      index: match.index,     // Starting character index of the heading line
    });
  }
  return headings;
}

/**
 * Enriches chunk metadata with file type and section title based on headings.
 * @param fileContent The original content of the file.
 * @param chunks The array of text chunks.
 * @param filename The name of the file.
 * @returns The array of chunks with enriched metadata.
 */
export function enrichChunkMetadata(
  fileContent: string,
  // Use the corrected Chunk type for input and output
  chunks: Chunk[],
  filename: string
): Chunk[] { // Still return Chunk[] but modify elements in place
  const headings = parseHeadings(fileContent);
  const fileType = path.extname(filename);
  let lastFoundIndex = -1;

  // Modify chunks in place instead of mapping to new objects
  chunks.forEach(chunk => {
    // Ensure metadata object exists on the original chunk
    chunk.metadata = chunk.metadata || {};

    // Add file_type directly to the chunk's metadata
    chunk.metadata.file_type = fileType;

    // Find Section Title
    const chunkStartIndex = fileContent.indexOf(chunk.text, lastFoundIndex + 1);
    if (chunkStartIndex !== -1) {
      lastFoundIndex = chunkStartIndex;
      // Find the last heading that occurred before this chunk's start index
      let relevantHeading = 'Unknown Section'; // Default
      for (let i = headings.length - 1; i >= 0; i--) {
        if (headings[i].index <= chunkStartIndex) {
          relevantHeading = headings[i].title;
          break; // Found the relevant heading
        }
      }
      // Assign directly to the chunk's metadata
      chunk.metadata.section_title = relevantHeading;
    } else {
      // Handle case where chunk text isn't found
      console.warn(`Could not find start index for chunk in file associated with ${filename}`);
      // Assign directly to the chunk's metadata
      chunk.metadata.section_title = 'Unknown Section (Chunk text not found)';
    }
  });

  // Return the original array with modified chunk metadata
  return chunks;
}
