import { resolve as resolvePath, extname, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { access, stat } from 'node:fs/promises';

// TypeScript interfaces for the loader
interface ResolveContext {
  parentURL?: string;
  conditions?: string[];
  importAssertions?: Record<string, string>;
}

interface ResolveResult {
  url: string;
  shortCircuit?: boolean;
  format?: string;
}

type NextResolve = (specifier: string, context: ResolveContext) => Promise<ResolveResult>;

export async function resolve(
  specifier: string, 
  context: ResolveContext, 
  nextResolve: NextResolve
): Promise<ResolveResult> {
  // Debug logging
  // console.log(`Resolving: ${specifier}`);
  
  // If the specifier already has an extension or is a node built-in, use the default resolver
  if (extname(specifier) || specifier.startsWith('node:') || specifier.includes('://')) {
    return nextResolve(specifier, context);
  }

  // Special handling for directory imports (more generic approach)
  // Check if the specifier ends with a directory name (no file extension)
  const segments = specifier.split('/');
  const lastSegment = segments[segments.length - 1];
  
  if (!lastSegment.includes('.')) {
    try {
      // First check if this is a directory
      const resolvedPath = fileURLToPath(new URL(specifier, context.parentURL));
      const stats = await stat(resolvedPath).catch(() => null);
      
      if (stats && stats.isDirectory()) {
        // It's a directory, append index.ts
        // console.log(`Resolving directory import: ${specifier}/index.ts`);
        return {
          url: new URL(specifier + '/index.ts', context.parentURL).href,
          shortCircuit: true
        };
      }
    } catch (error) {
      // Continue with normal resolution if there's an error
      console.log(`Error checking if directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }


  // Special handling for specific files without extensions
  const fileBasename = specifier.split('/').pop();
  if (fileBasename && !fileBasename.includes('.')) {
    const tsPath = specifier + '.ts';
    try {
      // Check if the .ts file exists relative to the parent URL
      const fullPath = new URL(tsPath, context.parentURL);
      await access(fileURLToPath(fullPath));
      return {
        url: fullPath.href,
        shortCircuit: true
      };
    } catch {
      // Continue with normal resolution if file doesn't exist
    }
  }

  // Resolve the full path of the module
  const resolvedPath = resolvePath(
    context.parentURL ? fileURLToPath(context.parentURL) : process.cwd(),
    specifier
  );

  try {
    // Check if it's a directory
    const stats = await stat(resolvedPath).catch(() => null);
    
    if (stats && stats.isDirectory()) {
      // Try to find index.ts in the directory
      try {
        await access(join(resolvedPath, 'index.ts'));
        // console.log(`Resolved directory to index.ts: ${resolvedPath}/index.ts`);
        return {
          url: pathToFileURL(join(resolvedPath, 'index.ts')).href,
          shortCircuit: true
        };
      } catch {
        // Try index.js if index.ts doesn't exist
        try {
          await access(join(resolvedPath, 'index.js'));
          // console.log(`Resolved directory to index.js: ${resolvedPath}/index.js`);
          return {
            url: pathToFileURL(join(resolvedPath, 'index.js')).href,
            shortCircuit: true
          };
        } catch {
          // No index files found, fallback to default resolver
          console.log(`No index files found in directory: ${resolvedPath}`);
        }
      }
    } else {
      // Check if the file with .ts or .js extension exists
      for (const ext of ['.ts', '.js']) {
        try {
          await access(`${resolvedPath}${ext}`);
          // console.log(`Resolved to file with extension: ${resolvedPath}${ext}`);
          return {
            url: pathToFileURL(`${resolvedPath}${ext}`).href,
            shortCircuit: true
          };
        } catch {
          // Continue to next extension
        }
      }
    }
  } catch (error) {
    // Error accessing the path
    console.log(`Error accessing path: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // If we get here, we couldn't resolve the module, so let's try one more approach
  // for directory imports that might be deeply nested
  try {
    const url = new URL(specifier, context.parentURL);
    const filePath = fileURLToPath(url);
    const stats = await stat(filePath).catch(() => null);
    
    if (stats && stats.isDirectory()) {
      // It's a directory, try to find an index file
      for (const indexFile of ['index.ts', 'index.js']) {
        try {
          const fullPath = join(filePath, indexFile);
          await access(fullPath);
          // console.log(`Resolved nested directory to: ${fullPath}`);
          return {
            url: pathToFileURL(fullPath).href,
            shortCircuit: true
          };
        } catch {
          // Continue to next index file option
        }
      }
    }
  } catch (error) {
    // Final fallback
    console.log(`Final resolution attempt failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return nextResolve(specifier, context);
}


