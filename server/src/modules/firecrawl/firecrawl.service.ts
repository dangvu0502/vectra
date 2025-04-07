import FirecrawlApp from '@mendable/firecrawl-js';
import { env } from '../../config/environment';

// TODO: Add Firecrawl API Key to environment variables
const apiKey = env.FIRECRAWL_API_KEY;

if (!apiKey) {
  console.warn('FIRECRAWL_API_KEY is not set. Firecrawl functionality will be disabled.');
}

const firecrawl = apiKey ? new FirecrawlApp({ apiKey }) : null;

export class FirecrawlService {
  async scrapeUrl(url: string): Promise<string | null> {
    if (!firecrawl) {
      console.error('Firecrawl API key not configured. Cannot scrape URL.');
      return null;
    }

    try {
      // Using scrapeUrl to get markdown content by default
      const scrapeResult = await firecrawl.scrapeUrl(url, {
        onlyMainContent: true, // Pass option directly
        // Specify format if needed, default is often markdown
        // formats: ['markdown'] 
        // Specify format if needed, default is often markdown
        // formats: ['markdown']
      });

      // Check explicitly if the result is an object and has the 'markdown' property of type string
      if (scrapeResult && typeof scrapeResult === 'object' && 'markdown' in scrapeResult && typeof scrapeResult.markdown === 'string') {
        // If the check passes, TypeScript should now recognize scrapeResult.markdown
        return scrapeResult.markdown;
      } else {
        // Log the actual result structure if markdown is missing or it's an error response
        console.error(`Failed to scrape markdown content from ${url} or received unexpected structure. Result:`, scrapeResult);
        return null;
      }
    } catch (error) {
      console.error(`Error scraping URL ${url}:`, error);
      return null;
    }
  }

  // Add other methods like crawlUrl if needed later
}

export const firecrawlService = new FirecrawlService();
