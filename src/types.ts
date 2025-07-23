import * as pdfjsLib from 'pdfjs-dist';
import { Worker } from 'tesseract.js';

/**
 * Core PDF Processing Types
 */
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
    ocrAttempted: boolean;
    ocrSucceeded: boolean;
    ocrConfidence: number;
    processingTime: number;
    warnings?: string[];
  };
}

/**
 * Gemini AI Question Types
 */
export interface GeminiQuestion {
  id: string;
  type: 'mcq' | 'fillblank' | 'truefalse';
  question: string;
  options?: string[];
  answer: string | boolean;
  explanation: string;
}

export interface QuestionGenerationRequest {
  content: string;
  mcqCount: number;
  fillBlankCount: number;
  trueFalseCount: number;
  difficulty: 'basic' | 'intermediate' | 'advanced';
}

/**
 * OCR Service Types
 */
export interface OcrWorkerOptions {
  worker: Worker;
  initializationError: string | null;
  initializationPromise: Promise<void> | null;
}

/**
 * PDF Processing Utility Types
 */
export interface CanvasProcessingParams {
  canvas: HTMLCanvasElement;
  worker: pdfjsLib.PDFPageProxy;
  onProgress?: (progress: number) => void;
}

/**
 * Error Handling Types
 */
export type ErrorType = 
  | 'OCR_INITIALIZATION'
  | 'NO_TEXT_EXTRACTED'
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE_TYPE'
  | 'API_KEY_REQUIRED'
  | 'UNKNOWN_ERROR';

export interface UserFacingError {
  message: string;
  type: ErrorType;
  timestamp: number;
  details?: string;
}

/**
 * Cache Types
 */
export interface ChunkCacheItem {
  content: string;
  timestamp: number;
  chunks: string[];
}
