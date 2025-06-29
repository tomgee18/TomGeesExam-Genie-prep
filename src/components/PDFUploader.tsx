import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { processPDF, PDFExtractionResult } from '@/lib/pdfProcessor';

interface PDFUploaderProps {
  onUpload: (result: PDFExtractionResult) => void;
}

const PDFUploader = ({ onUpload }: PDFUploaderProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File too large",
        description: "Please upload a PDF file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Reading PDF file...');
    
    try {
      const result = await processPDF(file);
      
      setProcessingStatus('Analyzing content structure...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setProcessingStatus('Extracting topics and sections...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onUpload(result);
      
      toast({
        title: "PDF processed successfully!",
        description: `Extracted ${result.chunks.length} sections from ${result.totalPages} pages`,
      });
    } catch (error) {
      console.error('Error processing PDF:', error);
      toast({
        title: "Error processing PDF",
        description: "Please try again with a different file.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
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

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        dragActive 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-300 hover:border-gray-400'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {isProcessing ? (
        <div className="space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600" />
          <h3 className="text-lg font-medium">Processing your PDF...</h3>
          <p className="text-gray-600">{processingStatus}</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <Upload className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2">Upload your study material</h3>
            <p className="text-gray-600 mb-4">
              Drag and drop your PDF here, or click to browse
            </p>
          </div>
          <div className="space-y-2">
            <Button asChild className="cursor-pointer">
              <label>
                <FileText className="w-4 h-4 mr-2" />
                Choose PDF File
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleInputChange}
                  className="hidden"
                />
              </label>
            </Button>
            <p className="text-xs text-gray-500">
              Supports PDF files up to 10MB
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFUploader;
