
import { useState, useCallback, useRef } from 'react'; // Added useRef
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Loader2, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { processEnhancedPDF, EnhancedPDFResult, PDFProcessingError, ProcessingProgress } from '@/lib/enhancedPdfProcessor';

interface EnhancedPDFUploaderProps {
  onUpload: (result: EnhancedPDFResult) => void;
}

const EnhancedPDFUploader = ({ onUpload }: EnhancedPDFUploaderProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const [error, setError] = useState<PDFProcessingError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null); // Added useRef for file input
  const { toast } = useToast();

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFile = async (file: File) => {
    setError(null);
    setIsProcessing(true);
    setProgress(null);
    // Note: We don't resetFileInput() here immediately,
    // because if processing fails and user wants to retry, the file should still be in the input.
    // Reset happens on successful upload, or when "Try Another File" is clicked.
    
    try {
      const result = await processEnhancedPDF(file, (progressInfo) => {
        setProgress(progressInfo);
      });
      
      onUpload(result);
      
      let toastDescription = `Extracted ${result.chunks.length} sections from ${result.totalPages} pages.`;
      if (result.metadata.warnings && result.metadata.warnings.length > 0) {
        toastDescription += `\nWarnings:\n- ${result.metadata.warnings.join('\n- ')}`;
      }

      toast({
        title: result.metadata.warnings && result.metadata.warnings.length > 0
               ? "PDF processed with warnings"
               : "PDF processed successfully!",
        description: toastDescription,
        duration: (result.metadata.warnings && result.metadata.warnings.length > 0) ? 10000 : 5000, // Longer duration if there are warnings
      });

      // Reset retry count on success
      setRetryCount(0);
      resetFileInput(); // Reset input on successful upload
    } catch (error) {
      console.error('Error processing PDF:', error);
      
      if (error instanceof PDFProcessingError) {
        setError(error);
        
        if (!error.recoverable) {
          toast({
            title: "Processing failed",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        const genericError = new PDFProcessingError(
          'An unexpected error occurred while processing the PDF.',
          'UNKNOWN_ERROR',
          true
        );
        setError(genericError);
      }
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const handleRetry = () => {
    if (error && error.recoverable && retryCount < 3) {
      setRetryCount(prev => prev + 1);
      // Implement exponential backoff
      const delay = Math.pow(2, retryCount) * 1000;
      setTimeout(() => {
        if (fileInputRef.current?.files && fileInputRef.current.files[0]) {
          handleFile(fileInputRef.current.files[0]);
        } else {
          // This case should ideally not happen if retry is only possible when a file was selected
          console.warn("Retry attempted but no file found in input ref.");
          setError(new PDFProcessingError("Could not retry: file no longer available.", "RETRY_NO_FILE", false));
        }
      }, delay);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  if (error && !error.recoverable) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-destructive mb-4">
            <AlertCircle className="w-5 h-5" />
            <h3 className="font-medium">Processing Failed</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
          <Button 
            onClick={() => {
              setError(null);
              resetFileInput(); // Also reset input when trying another file
            }}
            variant="outline"
            className="w-full"
          >
            Try Another File
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        dragActive 
          ? 'border-primary bg-primary/5' 
          : error && error.recoverable // Check if error is recoverable for specific styling
          ? 'border-amber-500/50 bg-amber-500/5' // Warning style for recoverable error
          : error // Non-recoverable error
          ? 'border-destructive/50 bg-destructive/5'
          : 'border-muted-foreground/25 hover:border-muted-foreground/50'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {isProcessing ? (
        <div className="space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <h3 className="text-lg font-medium">Processing your PDF...</h3>
          
          {progress && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{progress.message}</p>
              <Progress value={progress.progress} className="w-full" />
              <div className="flex justify-center">
                <Badge variant="secondary" className="text-xs">
                  {progress.stage.charAt(0).toUpperCase() + progress.stage.slice(1)}
                </Badge>
              </div>
            </div>
          )}
        </div>
      ) : error && error.recoverable ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-2 text-amber-600 dark:text-amber-500"> {/* Warning color */}
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-amber-700 dark:text-amber-400">Processing Error (Recoverable)</h3> {/* Warning color */}
            <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
          </div>
          <div className="flex space-x-2 justify-center">
            <Button onClick={handleRetry} disabled={retryCount >= 3}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry ({Math.max(0, 3 - retryCount)} left)
            </Button>
            <Button variant="outline" onClick={() => {
              setError(null);
              resetFileInput(); // Also reset input
            }}>
              Try Different File
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2">Upload your study material</h3>
            <p className="text-muted-foreground mb-4">
              Drag and drop your PDF here, or click to browse
            </p>
            <div className="flex flex-wrap gap-2 justify-center text-xs text-muted-foreground">
              <Badge variant="secondary">Digital PDFs</Badge>
              <Badge variant="secondary">Scanned Documents</Badge>
              <Badge variant="secondary">OCR Processing</Badge>
              <Badge variant="secondary">Multi-language</Badge>
            </div>
          </div>
          <div className="space-y-2">
            <Button asChild className="cursor-pointer">
              <label htmlFor="pdf-upload-input"> {/* Added htmlFor */}
                <FileText className="w-4 h-4 mr-2" />
                Choose PDF File
                <input
                  id="pdf-upload-input" // Added id
                  ref={fileInputRef} // Attach ref
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleInputChange}
                  className="hidden"
                />
              </label>
            </Button>
            <p className="text-xs text-muted-foreground">
              Supports PDF files up to 50MB • Digital text + OCR processing
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedPDFUploader;
