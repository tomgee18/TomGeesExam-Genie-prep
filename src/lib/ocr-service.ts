import * as Tesseract from 'tesseract.js';

/**
 * Singleton service for managing OCR operations
 */
export class OcrService {
  private static instance: OcrService;
  private worker: Tesseract.Worker | null = null;
  private initializationError: string | null = null;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): OcrService {
    if (!OcrService.instance) {
      OcrService.instance = new OcrService();
    }
    return OcrService.instance;
  }

  /**
   * Initializes the OCR worker if not already initialized
   * @returns Promise<void>
   */
  public async initializeWorker(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = new Promise(async (resolve, reject) => {
      try {
        this.worker = await Tesseract.createWorker();
        await this.worker.load();
        await this.worker.loadLanguage('eng');
        await this.worker.initialize('eng');
        resolve();
      } catch (error) {
        this.initializationError = 'Failed to initialize OCR engine. OCR will be skipped for scanned pages.';
        reject(new Error(this.initializationError));
      }
    });

    return this.initializationPromise;
  }

  /**
   * Preprocesses canvas image data to improve OCR quality
   * @param canvas The HTMLCanvasElement to preprocess
   */
  public preprocessCanvas(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Apply contrast enhancement
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const contrast = 1.5;
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));     // Red
      data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128)); // Green
      data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128)); // Blue
    }
    
    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Processes a canvas with OCR extraction
   * @param canvas The HTMLCanvasElement to process
   * @returns Promise containing the extracted text and confidence level
   */
  public async processCanvas(canvas: HTMLCanvasElement): Promise<{ text: string; confidence: number }> {
    if (!this.worker) {
      throw new Error('OCR worker not initialized');
    }
    
    try {
      const result = await this.worker.recognize(canvas, {
        logger: (m: { status: string; progress: number }) => {
          // You can add progress handling here if needed
        }
      });

      return {
        text: result.data.text,
        confidence: result.data.confidence
      };
    } catch (error) {
      console.error('OCR processing error:', error);
      return { text: '', confidence: 0 };
    }
  }

  /**
   * Terminates the OCR worker
   */
  public async terminateWorker(): Promise<void> {
    if (this.worker) {
      try {
        await this.worker.terminate();
        this.worker = null;
      } catch (error) {
        console.warn('Failed to terminate OCR worker:', error);
      }
    }
    this.initializationPromise = null;
  }

  /**
   * Checks if the worker is initialized
   */
  public isInitialized(): boolean {
    return !!this.worker;
  }

  /**
   * Gets the initialization error message if any
   */
  public getInitializationError(): string | null {
    return this.initializationError;
  }
}
