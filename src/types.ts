import * as pdfjsLib from 'pdfjs-dist';
import { Worker } from 'tesseract.js';

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

// OCR Service Types
export interface OcrWorkerOptions {
  worker: Worker;
  initializationError: string | null;
  initializationPromise: Promise<void> | null;
}

// PDF Processing Types
export interface CanvasProcessingParams {
  canvas: HTMLCanvasElement;
  worker: pdfjsLib.PDFPageProxy;
  onProgress?: (progress: number) => void;
}

// Progress Reporting
export interface ProgressReport {
  value: number;
  message: string;
}
