import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

// Configure worker to use local version
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();

export interface ProcessingProgress {
  stage: 'loading' | 'extracting' | 'ocr' | 'chunking' | 'complete';
  progress: number;
  message: string;
}

export interface EnhancedPDFChunk {
  content: string;
  pageStart: number;
  pageEnd: number;
  heading?: string;
  tokenCount: number;
  extractionMethod: 'digital' | 'ocr' | 'hybrid';
  confidence?: number;
}

export interface EnhancedPDFResult {
  chunks: EnhancedPDFChunk[];
  totalPages: number;
  topics: string[];
  fullText: string;
  metadata: {
    hasDigitalText: boolean;
    hasScannedContent: boolean; // Indicates if scanned content was detected
    ocrAttempted: boolean;      // Indicates if OCR processing was attempted
    ocrSucceeded: boolean;      // Indicates if OCR processing (if attempted) was successful
    ocrConfidence: number;
    processingTime: number;
    warnings?: string[];        // For non-critical issues, like OCR failing to initialize
  };
}

export class PDFProcessingError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'PDFProcessingError';
  }
}


/**
 * Estimate the number of tokens in a string (approximate, for chunking).
 * @param text The text to estimate tokens for.
 * @returns Estimated token count.
 */
const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4);
};

/**
 * Extract likely headings from text using regex patterns.
 * @param text The text to extract headings from.
 * @returns Array of unique headings (max 30).
 */
const extractHeadings = (text: string): string[] => {
  const headings: string[] = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.length > 0 && trimmedLine.length < 100) {
      // Improved heading patterns
      if (
        (/^[A-Z][A-Za-z\s\d,:;\-]{0,80}$/.test(trimmedLine) && !/[.?!]$/.test(trimmedLine)) ||
        /^\d+[.)]\s/.test(trimmedLine) ||
        /^Chapter\s+\d+/i.test(trimmedLine) ||
        /^Section\s+\d+/i.test(trimmedLine)
      ) {
        headings.push(trimmedLine);
      }
    }
  }
  return [...new Set(headings)].slice(0, 30);
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
const chunkText = (
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


// OCR processing with preprocessing
const processPageWithOCR = async (
  canvas: HTMLCanvasElement,
  worker: Tesseract.Worker,
  onProgress?: (progress: number) => void
): Promise<{ text: string; confidence: number }> => {
  try {
    // Image preprocessing for better OCR
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // Simple contrast enhancement
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const contrast = 1.5;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
        data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
        data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
      }
      ctx.putImageData(imageData, 0, 0);
    }

    const result = await worker.recognize(canvas, {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(m.progress);
        }
      }
    });

    return {
      text: result.data.text,
      confidence: result.data.confidence
    };
  } catch (error) {
    console.error('OCR processing failed:', error);
    return { text: '', confidence: 0 };
  }
};

