import * as pdfjsLib from 'pdfjs-dist';
import { OcrService } from './ocr-service';

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

import { extractHeadings } from './utils/heading-utils';

/**
 * Chunk text into segments, mapping each chunk to real PDF page numbers.
 * Includes input validation and warnings for best practices.
 * @param text The full extracted text.
 * @param paragraphPageMap Array mapping each paragraph to its PDF page number.
 * @param maxTokens Maximum tokens per chunk.
 * @returns Array of EnhancedPDFChunk objects.
 * @throws Error if input validation fails.
 */
import { chunkText } from './utils/chunk-utils';




/**
 * Main processing function for enhanced PDF extraction and chunking.
 * Handles digital and scanned PDFs, including OCR fallback.
 */
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

  async function initializeOcrWorkerIfNeeded() {
    if (!ocrWorker && !ocrInitializationError) {
      ocrAttemptedOnDocument = true;
      try {
        ocrWorker = await createWorker();
        await ocrWorker.load();
        await ocrWorker.loadLanguage('eng');
        await ocrWorker.initialize('eng');
      } catch (err) {
        ocrInitializationError =
          'Failed to initialize OCR engine. OCR will be skipped for scanned pages.';
        warnings.push(ocrInitializationError);
      }
    }
  }

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
    onProgress?.({ stage: 'loading', progress: 10, message: 'Loading PDF document...' });
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    const totalPages = pdf.numPages;
    onProgress?.({ stage: 'extracting', progress: 20, message: 'Extracting text from pages...' });
    let fullText = '';
    let hasDigitalText = false;
    let hasScannedContent = false;
    let totalConfidence = 0;
    let ocrPageCount = 0;
    const paragraphPageMap: number[] = [];
    const ocrService = OcrService.getInstance();
    let ocrInitialized = false;
    let ocrInitializationError: string | null = null;

    // Process each page
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map(item => (typeof item.str === 'string' ? item.str : ''))
        .join(' ');
      const progress = 20 + (pageNum / totalPages) * 50;
      let pageProducedParagraphs = 0;
      if (pageText.trim().length > 50) {
        // Digital text available
        fullText += pageText + '\n\n';
        hasDigitalText = true;
        // Map each paragraph to this page
        const paragraphs = pageText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        pageProducedParagraphs = paragraphs.length;
        for (let i = 0; i < paragraphs.length; i++) {
          paragraphPageMap.push(pageNum);
        }
        if (pageProducedParagraphs === 0) {
          warnings.push(`No paragraphs detected on page ${pageNum}.`);
        }
        onProgress?.({
          stage: 'extracting',
          progress,
          message: `Extracting text from page ${pageNum}/${totalPages}...`
        });
      } else {
        // Likely scanned content, use OCR
        hasScannedContent = true;
        
        if (!ocrInitialized && !ocrInitializationError) {
          try {
            await ocrService.initializeWorker();
            ocrInitialized = true;
          } catch (err) {
            ocrInitializationError =
              'Failed to initialize OCR engine. OCR will be skipped for scanned pages.';
            warnings.push(ocrInitializationError);
          }
        }

        if (ocrInitialized) {
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
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            ocrService.preprocessCanvas(canvas);
            const ocrResult = await ocrService.processCanvas(canvas);
            if (ocrResult.text.trim()) {
              fullText += ocrResult.text + '\n\n';
              totalConfidence += ocrResult.confidence;
              ocrPageCount++;
              ocrSucceededOnAnyPage = true;
              // Map each paragraph to this page
              const paragraphs = ocrResult.text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
              pageProducedParagraphs = paragraphs.length;
              for (let i = 0; i < paragraphs.length; i++) {
                paragraphPageMap.push(pageNum);
              }
              if (pageProducedParagraphs === 0) {
                warnings.push(`No paragraphs detected on page ${pageNum} (OCR).`);
              }
            }
          }
        } else if (ocrInitializationError) {
          onProgress?.({
            stage: 'ocr',
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
    onProgress?.({ stage: 'chunking', progress: 80, message: 'Analyzing content structure...' });
    // Clean up text
    fullText = fullText.replace(/\s+/g, ' ').trim();
    if (!fullText && ocrInitializationError && !hasDigitalText) {
      throw new PDFProcessingError(
        ocrInitializationError || 'OCR engine failed to initialize, and no digital text found.',
        'OCR_INIT_FAILED_NO_TEXT',
        false
      );
    } else if (!fullText && !hasDigitalText && hasScannedContent && !ocrInitializationError) {
      throw new PDFProcessingError(
        'No text could be extracted. The document might be image-based and OCR found no text, or it is corrupted.',
        'NO_TEXT_EXTRACTED_OCR_EMPTY',
        false
      );
    } else if (!fullText) {
      throw new PDFProcessingError(
        'No text could be extracted from this PDF. The document may be corrupted or contain only images.',
        'NO_TEXT_EXTRACTED',
        false
      );
    }
    // Extract topics and create chunks
    const topics = extractHeadings(fullText);
    const chunks = chunkText(fullText, paragraphPageMap);
    const avgConfidence = ocrPageCount > 0 ? totalConfidence / ocrPageCount : 0;
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
    if (ocrWorker) {
      try {
        await ocrWorker.terminate();
      } catch (error) {
        console.warn('Failed to terminate OCR worker:', error);
      }
    }
  }
  throw new Error('Unexpected error in processEnhancedPDF');
};

