/**
 * Helper function to estimate token count
 * @param text The text to estimate tokens for
 * @returns Estimated token count
 */
export const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4);
};
 * Helper function to split content into chunks based on max tokens
 * Tries to split along paragraph breaks if possible.
 * @param text The full text to split
 * @param maxTokens Maximum tokens per chunk
 * @returns Array of text chunks
 */
export const splitContentIntoChunks = (text: string, maxTokens: number): string[] => {
  const estimatedTotalTokens = estimateTokens(text);
  if (estimatedTotalTokens <= maxTokens) {
    return [text];
  }

  const chunks: string[] = [];
  // Split by paragraphs first to maintain some coherence
  const paragraphs = text.split(/\n\s*\n+/);
  let currentChunk = "";
  let currentChunkTokens = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);
    if (currentChunkTokens + paragraphTokens > maxTokens && currentChunkTokens > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
      currentChunkTokens = paragraphTokens;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
      currentChunkTokens += paragraphTokens;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // If any chunk is still too large after paragraph splitting (e.g. a very long single paragraph),
  // we might need a harder split by character count or sentences.
  // For now, this basic paragraph-based splitting is a first step.
  // A more robust solution would re-split oversized chunks.
  return chunks.filter(chunk => chunk.length > 0);
};
 * Creates a memoized version of a function that accepts multiple arguments
 * @param func The function to memoize
 * @returns Memoized function with cache
 */
export function memoizeMultiple<T extends (...args: any[]) => any>(func: T): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key) as ReturnType<T>;
    }
    
    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Creates a memoized version of an async function with TTL (Time-To-Live)
 * @param func The async function to memoize
 * @param ttl Time-to-live for cache entries in milliseconds
 * @returns Memoized async function with time-based cache
 */
export function memoizeAsync<T extends (...args: any[]) => Promise<any>>(
  func: T,
  ttl = 5000
): T {
  const cache = new Map<string, { result: ReturnType<T>; timestamp: number }>();
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    const now = Date.now();
    
    if (cache.has(key)) {
      const entry = cache.get(key)!;
      
      if (now - entry.timestamp < ttl) {
        return entry.result as ReturnType<T>;
      }
      
      cache.delete(key);
    }
    
    const resultPromise = func(...args);
    cache.set(key, { result: resultPromise as ReturnType<T>, timestamp: now });
    
    return resultPromise as ReturnType<T>;
  }) as T;
}

/**
 * Memoizes a function that processes content chunks for question generation
 * @param func The function to memoize
 * @param ttl Time-to-live for cache entries in milliseconds
 * @returns Memoized function with chunk-based caching
 */
export function memoizeChunkProcessing<T extends (content: string, chunkSize: number) => any>(
  func: T,
  ttl = 30000 // Default 30 seconds for chunk processing
): T {
  const cache = new Map<string, { result: ReturnType<T>; timestamp: number }>();
  
  return ((content: string, chunkSize: number): ReturnType<T> => {
    const key = `chunk:${content.substring(0, 120)}...:${chunkSize}`;
    const now = Date.now();
    
    if (cache.has(key)) {
      const entry = cache.get(key)!;
      
      if (now - entry.timestamp < ttl) {
        return entry.result as ReturnType<T>;
      }
      
      cache.delete(key);
    }
    
    const result = func(content, chunkSize);
    cache.set(key, { result: result as ReturnType<T>, timestamp: now });
    
    return result as ReturnType<T>;
  }) as T;
}
