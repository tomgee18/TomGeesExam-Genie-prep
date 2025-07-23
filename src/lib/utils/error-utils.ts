import { ErrorType, UserFacingError } from '@/types';

/**
 * Classifies an error into a standardized type
 * @param error The error to classify
 * @returns ErrorType classification
 */
export const determineErrorType = (error: unknown): ErrorType => {
  if (error instanceof Error) {
    if (error.message.includes('OCR')) return 'OCR_INITIALIZATION';
    if (error.message.includes('text could not be extracted')) return 'NO_TEXT_EXTRACTED';
    if (error.message.includes('File too large')) return 'FILE_TOO_LARGE';
    if (error.message.includes('Invalid file type')) return 'INVALID_FILE_TYPE';
    if (error.message.includes('API key')) return 'API_KEY_REQUIRED';
  }
  return 'UNKNOWN_ERROR';
};

/**
 * Generates a user-friendly error message
 * @param errorType The classified error type
 * @returns User-facing error message
 */
export const generateUserMessage = (errorType: ErrorType): string => {
  const messages: Record<ErrorType, string> = {
    'OCR_INITIALIZATION': 'Failed to initialize OCR engine. Please try again.',
    'NO_TEXT_EXTRACTED': 'No text could be extracted from this PDF.',
    'FILE_TOO_LARGE': 'The file is too large. Please upload a PDF smaller than 50MB.',
    'INVALID_FILE_TYPE': 'Invalid file type. Please upload a PDF file.',
    'API_KEY_REQUIRED': 'A valid Gemini API key is required.',
    'UNKNOWN_ERROR': 'An unexpected error occurred. Please try again.'
  };
  
  return messages[errorType];
};

/**
 * Standard error handler for the application
 * @param error The error to handle
 * @param context Additional context for the error
 * @returns A standardized UserFacingError object
 */
export const handleError = (error: unknown, context?: Record<string, any>): UserFacingError => {
  const errorType = determineErrorType(error);
  const userMessage = generateUserMessage(errorType);
  
  // Log error to monitoring service (add actual implementation)
  console.error('Application Error:', {
    type: errorType,
    message: userMessage,
    error,
    context,
    timestamp: new Date().toISOString()
  });
  
  return {
    message: userMessage,
    type: errorType,
    timestamp: Date.now(),
    details: error instanceof Error ? error.message : 'Unknown error details'
  };
};
