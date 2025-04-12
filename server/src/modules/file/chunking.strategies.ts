import { cogito } from '@/core/llm-adapter'; // Assuming LLM might be needed for future extraction strategies

// Base parameters can be defined here or passed in
export const defaultBaseChunkParams = {
  size: 256, // Default chunk size in tokens/characters depending on strategy
  overlap: 50, // Default overlap between chunks to maintain local context
  // Potential future extraction config:
  // extract: {
  //   title: { llm: cogito },
  //   questions: { llm: cogito },
  //   keywords: { llm: cogito },
  // }
};

/**
 * Determines the appropriate chunking parameters based on the file extension.
 * @param fileType - The lowercased file extension (e.g., '.pdf', '.md').
 * @param baseParams - Optional base parameters to override defaults.
 * @returns The specific chunking parameters for the given file type.
 */
export function getChunkingParams(fileType: string, baseParams: any = defaultBaseChunkParams): any {
  let specificParams: any = {};

  // Determine strategy and specific parameters based on file type
  // Aims for context-aware chunking where possible (e.g., Markdown, HTML)
  switch (fileType) {
    case '.md':
      // Markdown strategy attempts to respect document structure (sections, paragraphs)
      specificParams = {
        strategy: 'markdown',
        // Enable header extraction to capture structure (adjust levels as needed)
        headers: [
            ['#', 'h1'],
            ['##', 'h2'],
            ['###', 'h3'],
            // Add more levels if necessary ['####', 'h4'], etc.
        ],
        size: 512, // Larger size often suitable for markdown documents
      };
      break;
    case '.html':
    case '.htm':
      specificParams = {
        strategy: 'html',
        size: 512, // Larger size for HTML
      };
      break;
    case '.json':
      // Note: 'maxSize' is specific to JSON strategy, 'size' might not apply directly
      specificParams = {
        strategy: 'json',
        maxSize: 1024,
        // Ensure size/overlap from base are not included if irrelevant
        size: undefined,
        overlap: undefined,
      };
      break;
    case '.tex':
      specificParams = {
        strategy: 'latex',
        size: 512, // Larger size for LaTeX
      };
      break;
    // Add cases for other file types like .pdf, .docx, .csv etc. if needed
    // case '.pdf':
    //   specificParams = { strategy: 'pdf', size: 512 }; // Example
    //   break;
    default: // Default to token strategy for unknown or plain text files
      specificParams = {
        strategy: 'token',
        // Use default size/overlap from baseParams
      };
      break;
  }

  // Merge base parameters with specific overrides
  // Ensure specific undefined values correctly override base values if needed
  const finalParams = { ...baseParams };
  for (const key in specificParams) {
    if (specificParams[key] !== undefined) {
      finalParams[key] = specificParams[key];
    } else {
      // If specificParam is explicitly undefined, remove the key from base
      delete finalParams[key];
    }
  }


  // Clean up potentially conflicting params if strategy changed size/overlap relevance
  if (finalParams.strategy === 'json' && finalParams.size !== undefined) {
     // console.warn("Removing 'size' param for JSON strategy as 'maxSize' is used.");
     delete finalParams.size;
     delete finalParams.overlap; // Overlap likely irrelevant too
  }


  return finalParams;
}
