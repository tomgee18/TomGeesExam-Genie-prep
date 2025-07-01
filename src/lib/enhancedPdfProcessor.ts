
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
  let ocrWorker: Tesseract.Worker | null = null;
  let ocrInitializationError: string | null = null;
  let ocrAttemptedOnDocument = false;
  let ocrSucceededOnAnyPage = false;
  const warnings: string[] = [];

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

    // OCR worker will be initialized lazily if needed.
    const initializeOcrWorkerIfNeeded = async () => {
      if (ocrWorker || ocrInitializationError) return; // Already initialized or failed

      ocrAttemptedOnDocument = true; // Mark that we are attempting OCR at least once for this document.
      try {
        const workerPath = new URL('/tesseract/worker.min.js', window.location.origin).toString();
        const corePath = new URL('/tesseract/tesseract-core.wasm.js', window.location.origin).toString(); // Adjust if different core file
        const langPath = new URL('/tesseract/lang-data', window.location.origin).toString();

        ocrWorker = await createWorker('eng', 1, {
          workerPath,
          corePath,
          langPath,
          // logger: m => console.log(m) // For debugging
        });
      } catch (err) {
        console.error("Failed to initialize OCR worker with local assets:", err);
        ocrInitializationError = 'OCR engine failed to initialize. Scanned content may not be processed. Error: ' + (err instanceof Error ? err.message : String(err));
        warnings.push(ocrInitializationError);
        // Do not throw here, allow digital text processing to continue.
      }
    };

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
        await initializeOcrWorkerIfNeeded(); // Attempt to initialize OCR worker if not already done

        if (ocrWorker && !ocrInitializationError) {
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
              ocrSucceededOnAnyPage = true;
            }
          }
        } else if (ocrInitializationError) {
          // OCR worker failed to initialize, skip OCR for this page
          onProgress?.({
            stage: 'ocr', // Still indicate OCR stage, but with a warning/skip message
            progress,
            message: `Skipping OCR on page ${pageNum}/${totalPages} (OCR engine init failed).`
          });
        }
      }
    }

    // If OCR was attempted but initialization failed, ensure this is clear.
    if (ocrAttemptedOnDocument && ocrInitializationError && !ocrSucceededOnAnyPage) {
        // warnings.push(ocrInitializationError); // Already added when error occurred
    }


    onProgress?.({
      stage: 'chunking',
      progress: 80,
      message: 'Analyzing content structure...'
    });

    // Clean up text
    fullText = fullText.replace(/\s+/g, ' ').trim();

    if (!fullText && ocrInitializationError && !hasDigitalText) {
      // If there's no text at all, AND OCR failed to initialize, AND there was no digital text,
      // then this is a hard failure. Re-throw the OCR initialization error as critical.
      throw new PDFProcessingError(
        ocrInitializationError || 'OCR engine failed to initialize, and no digital text found.',
        'OCR_INIT_FAILED_NO_TEXT',
        false
      );
    } else if (!fullText && !hasDigitalText && hasScannedContent && !ocrInitializationError) {
      // If no text, but there was scanned content and OCR init did NOT fail, it means OCR ran but found nothing.
       throw new PDFProcessingError(
        'No text could be extracted. The document might be image-based and OCR found no text, or it is corrupted.',
        'NO_TEXT_EXTRACTED_OCR_EMPTY',
        false
      );
    } else if (!fullText) {
      // General case if no text is extracted
      throw new PDFProcessingError(
        'No text could be extracted from this PDF. The document may be corrupted or contain only images.',
        'NO_TEXT_EXTRACTED',
        false
      );
    }

    // Extract topics and create chunks
    const topics = extractHeadings(fullText);
    const chunks = chunkText(fullText);

    const avgConfidence = ocrPageCount > 0 ? totalConfidence / ocrPageCount : 0; // Default to 0 if no OCR pages

    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: warnings.length > 0 ? `Processing complete with warnings.` : 'Processing complete!'
    });

    return {
      chunks,
      totalPages,
      topics,
      fullText,
      metadata: {
        hasDigitalText,
        hasScannedContent,
        ocrAttempted: ocrAttemptedOnDocument,
        ocrSucceeded: ocrSucceededOnAnyPage,
        ocrConfidence: avgConfidence,
        processingTime: Date.now() - startTime,
        warnings: warnings.length > 0 ? warnings : undefined
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
