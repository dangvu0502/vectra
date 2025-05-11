// Default base parameters for chunking. These can be overridden.
export const defaultBaseChunkParams = {
  size: 256, // Default chunk size (tokens/characters based on strategy)
  overlap: 50, // Default overlap between chunks
  // TODO: Consider future LLM-based extraction config for titles, keywords, etc.
  // extract: {
  //   title: { llm: someLanguageModel },
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
// TODO: Refactor to use a defined type for chunking parameters instead of 'any'.
export function getChunkingParams(fileType: string, baseParams: any = defaultBaseChunkParams): any {
  let specificParams: any = {};

  // Strategies aim for context-aware chunking where possible.
  switch (fileType) {
    case '.md':
      // Markdown: Respects document structure (sections, paragraphs).
      specificParams = {
        strategy: 'markdown',
        // Header extraction captures structure (adjust levels as needed).
        headers: [
            ['#', 'h1'],
            ['##', 'h2'],
            ['###', 'h3'],
            // TODO: Consider adding more header levels if necessary.
        ],
        size: 512, // Larger size often suitable for markdown.
      };
      break;
    case '.html':
    case '.htm':
      specificParams = {
        strategy: 'html',
        size: 512,
      };
      break;
    case '.json':
      // JSON strategy uses 'maxSize' for chunks; 'size' and 'overlap' are typically irrelevant.
      specificParams = {
        strategy: 'json',
        maxSize: 1024,
        size: undefined,    // Explicitly override base 'size'
        overlap: undefined, // Explicitly override base 'overlap'
      };
      break;
    case '.tex':
      specificParams = {
        strategy: 'latex',
        size: 512,
      };
      break;
    // TODO: Add cases for other file types like .pdf, .docx, .csv as needed.
    default:
      // Default to token-based strategy for unknown or plain text files.
      specificParams = {
        strategy: 'token',
        // Inherits size/overlap from baseParams.
      };
      break;
  }

  // Merge base parameters with type-specific overrides.
  // Explicitly undefined values in specificParams will remove the corresponding key from baseParams.
  const finalParams = { ...baseParams };
  for (const key in specificParams) {
    if (specificParams[key] !== undefined) {
      finalParams[key] = specificParams[key];
    } else {
      delete finalParams[key];
    }
  }
  
  // Note: The logic to delete size/overlap for JSON is now handled by setting them to undefined
  // in the specificParams for the '.json' case, which then get removed by the merging loop.

  return finalParams;
}
