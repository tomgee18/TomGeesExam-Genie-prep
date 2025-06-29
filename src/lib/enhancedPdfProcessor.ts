
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
    hasScannedContent: boolean;
    ocrConfidence: number;
    processingTime: number;
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

// Enhanced token estimation
const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4);
};

// Advanced heading extraction
const extractHeadings = (text: string): string[] => {
  const headings: string[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.length > 0 && trimmedLine.length < 100) {
      // Multiple heading patterns
      if (
        /^[A-Z][^.]*$/.test(trimmedLine) || 
        /^\d+[\.\)]\s/.test(trimmedLine) ||
        /^Chapter\s+\d+/i.test(trimmedLine) ||
        /^Section\s+\d+/i.test(trimmedLine) ||
        /^[A-Z\s]{3,50}$/.test(trimmedLine)
      ) {
        headings.push(trimmedLine);
      }
    }
  }
  
  return [...new Set(headings)].slice(0, 30);
};

// Enhanced chunking with context preservation
const chunkText = (text: string, maxTokens: number = 2000): EnhancedPDFChunk[] => {
  const chunks: EnhancedPDFChunk[] = [];
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  let currentChunk = '';
  let chunkStart = 0;
  
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();
    const potentialChunk = currentChunk + (currentChunk ? '\n\n' : '') + paragraph;
    
    if (estimateTokens(potentialChunk) > maxTokens && currentChunk) {
      chunks.push({
        content: currentChunk,
        pageStart: chunkStart,
        pageEnd: i,
        tokenCount: estimateTokens(currentChunk),
        extractionMethod: 'digital'
      });
      
      currentChunk = paragraph;
      chunkStart = i;
    } else {
      currentChunk = potentialChunk;
    }
  }
  
  if (currentChunk) {
    chunks.push({
      content: currentChunk,
      pageStart: chunkStart,
      pageEnd: paragraphs.length - 1,
      tokenCount: estimateTokens(currentChunk),
      extractionMethod: 'digital'
    });
  }
  
  return chunks;
};

// OCR processing with preprocessing
const processPageWithOCR = async (
  canvas: HTMLCanvasElement,
  worker: any,
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
      logger: (m: any) => {
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

// Main processing function with circuit breaker pattern
export const processEnhancedPDF = async (
  file: File,
  onProgress?: (progress: ProcessingProgress) => void
): Promise<EnhancedPDFResult> => {
  const startTime = Date.now();
  let ocrWorker: any = null;
  
  try {
    // Validate file
    if (!file.type.includes('pdf')) {
      throw new PDFProcessingError(
        'Invalid file type. Please upload a PDF file.',
        'INVALID_FILE_TYPE',
        false
      );
    }

    if (file.size > 50 * 1024 * 1024) {
      throw new PDFProcessingError(
        'File too large. Please upload a PDF smaller than 50MB.',
        'FILE_TOO_LARGE',
        false
      );
    }

    onProgress?.({
      stage: 'loading',
      progress: 10,
      message: 'Loading PDF document...'
    });

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    const totalPages = pdf.numPages;

    onProgress?.({
      stage: 'extracting',
      progress: 20,
      message: 'Extracting text from pages...'
    });

    let fullText = '';
    let hasDigitalText = false;
    let hasScannedContent = false;
    let totalConfidence = 0;
    let ocrPageCount = 0;

    // Initialize OCR worker
    ocrWorker = await createWorker('eng');

    // Process each page
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');

      const progress = 20 + (pageNum / totalPages) * 50;
      
      if (pageText.trim().length > 50) {
        // Digital text available
        fullText += pageText + '\n\n';
        hasDigitalText = true;
        
        onProgress?.({
          stage: 'extracting',
          progress,
          message: `Extracting text from page ${pageNum}/${totalPages}...`
        });
      } else {
        // Likely scanned content, use OCR
        hasScannedContent = true;
        
        onProgress?.({
          stage: 'ocr',
          progress,
          message: `Processing scanned content on page ${pageNum}/${totalPages}...`
        });

        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;

          const ocrResult = await processPageWithOCR(canvas, ocrWorker);
          if (ocrResult.text.trim()) {
            fullText += ocrResult.text + '\n\n';
            totalConfidence += ocrResult.confidence;
            ocrPageCount++;
          }
        }
      }
    }

    onProgress?.({
      stage: 'chunking',
      progress: 80,
      message: 'Analyzing content structure...'
    });

    // Clean up text
    fullText = fullText.replace(/\s+/g, ' ').trim();

    if (!fullText) {
      throw new PDFProcessingError(
        'No text could be extracted from this PDF. The document may be corrupted or contain only images.',
        'NO_TEXT_EXTRACTED',
        false
      );
    }

    // Extract topics and create chunks
    const topics = extractHeadings(fullText);
    const chunks = chunkText(fullText);

    const avgConfidence = ocrPageCount > 0 ? totalConfidence / ocrPageCount : 100;

    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'Processing complete!'
    });

    return {
      chunks,
      totalPages,
      topics,
      fullText,
      metadata: {
        hasDigitalText,
        hasScannedContent,
        ocrConfidence: avgConfidence,
        processingTime: Date.now() - startTime
      }
    };

  } catch (error) {
    if (error instanceof PDFProcessingError) {
      throw error;
    }
    
    throw new PDFProcessingError(
      `Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'PROCESSING_FAILED',
      true
    );
  } finally {
    // Cleanup OCR worker
    if (ocrWorker) {
      try {
        await ocrWorker.terminate();
      } catch (error) {
        console.warn('Failed to terminate OCR worker:', error);
      }
    }
  }
};
