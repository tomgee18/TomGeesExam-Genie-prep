import { EnhancedPDFChunk } from '../../types';

export const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4);
};

/**
 * Chunk text into segments, mapping each chunk to real PDF page numbers.
 * Includes input validation and warnings for best practices.
 * @param text The full extracted text.
 * @param paragraphPageMap Array mapping each paragraph to its PDF page number.
 * @param maxTokens Maximum tokens per chunk.
 * @returns Array of EnhancedPDFChunk objects.
 * @throws Error if input validation fails.
 */
export const chunkText = (
  text: string,
  paragraphPageMap: number[],
  maxTokens: number = 2000
): EnhancedPDFChunk[] => {
  const chunks: EnhancedPDFChunk[] = [];
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

  // Input validation
  if (!Array.isArray(paragraphPageMap) || !paragraphPageMap.every(n => typeof n === 'number')) {
    throw new Error('paragraphPageMap must be an array of numbers.');
  }
  if (paragraphPageMap.length !== paragraphs.length) {
    throw new Error(`paragraphPageMap length (${paragraphPageMap.length}) does not match paragraphs length (${paragraphs.length}).`);
  }

  let currentChunk = '';
  let chunkStart = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();
    const potentialChunk = currentChunk + (currentChunk ? '\n\n' : '') + paragraph;

    if (estimateTokens(potentialChunk) > maxTokens && currentChunk) {
      const startPage = paragraphPageMap[chunkStart];
      const endPage = paragraphPageMap[i - 1];
      if (currentChunk.trim().length > 0) {
        chunks.push({
          content: currentChunk,
          pageStart: startPage,
          pageEnd: endPage,
          tokenCount: estimateTokens(currentChunk),
          extractionMethod: 'digital'
        });
      }
      currentChunk = paragraph;
      chunkStart = i;
    } else {
      currentChunk = potentialChunk;
    }
  }

  if (currentChunk && currentChunk.trim().length > 0) {
    const startPage = paragraphPageMap[chunkStart];
    const endPage = paragraphPageMap[paragraphs.length - 1];
    chunks.push({
      content: currentChunk,
      pageStart: startPage,
      pageEnd: endPage,
      tokenCount: estimateTokens(currentChunk),
      extractionMethod: 'digital'
    });
  }

  return chunks;
};
