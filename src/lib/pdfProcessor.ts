
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface PDFChunk {
  content: string;
  pageStart: number;
  pageEnd: number;
  heading?: string;
  tokenCount: number;
}

export interface PDFExtractionResult {
  chunks: PDFChunk[];
  totalPages: number;
  topics: string[];
  fullText: string;
}

// Simple token estimation
const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4);
};

// Extract headings from text (simple heuristic)
const extractHeadings = (text: string): string[] => {
  const headings: string[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    // Look for lines that might be headings (short, capitalized, etc.)
    if (trimmedLine.length > 0 && trimmedLine.length < 100) {
      if (/^[A-Z][^.]*$/.test(trimmedLine) || /^\d+\./.test(trimmedLine)) {
        headings.push(trimmedLine);
      }
    }
  }
  
  return [...new Set(headings)].slice(0, 20); // Limit to 20 unique headings
};

// Chunk text into manageable pieces
const chunkText = (text: string, maxTokens: number = 2000): PDFChunk[] => {
  const chunks: PDFChunk[] = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  let chunkStart = 0;
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim() + '.';
    const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;
    
    if (estimateTokens(potentialChunk) > maxTokens && currentChunk) {
      // Save current chunk
      chunks.push({
        content: currentChunk,
        pageStart: chunkStart,
        pageEnd: i - 1,
        tokenCount: estimateTokens(currentChunk)
      });
      // Start new chunk
      currentChunk = sentence;
      chunkStart = i;
    } else {
      currentChunk = potentialChunk;
    }
  }
  
  // Add final chunk
  if (currentChunk) {
    chunks.push({
      content: currentChunk,
      pageStart: chunkStart,
      pageEnd: sentences.length - 1,
      tokenCount: estimateTokens(currentChunk)
    });
  }
  
  return chunks;
};

export const processPDF = async (file: File): Promise<PDFExtractionResult> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  
  let fullText = '';
  const totalPages = pdf.numPages;
  
  // Extract text from all pages
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => (typeof (item as any).str === 'string' ? (item as any).str : ''))
      .join(' ');
    fullText += pageText + '\n\n';
  }
  
  // Clean up text
  fullText = fullText.replace(/\s+/g, ' ').trim();
  
  // Extract topics/headings
  const topics = extractHeadings(fullText);
  
  // Create chunks
  const chunks = chunkText(fullText);
  
  return {
    chunks,
    totalPages,
    topics,
    fullText
  };
};
