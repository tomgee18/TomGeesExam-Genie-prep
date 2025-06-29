
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PDFUploaderProps {
  onUpload: (content: string) => void;
}

const PDFUploader = ({ onUpload }: PDFUploaderProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
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

    setIsProcessing(true);
    
    try {
      // Simulate PDF processing for now
      // In a real implementation, you'd use pdf-js or similar library
      const simulatedContent = `
        # Sample PDF Content

        ## Introduction to Computer Science
        Computer science is the study of computational systems and the design of computer systems and their uses in computing. It includes the study of algorithms, data structures, and computational complexity.

        ### Key Topics:
        - Programming fundamentals
        - Data structures and algorithms
        - Computer architecture
        - Operating systems
        - Database systems
        - Software engineering
        - Computer networks
        - Artificial intelligence

        ## Programming Fundamentals
        Programming is the process of creating a set of instructions that tell a computer how to perform a task. Programming can be done using a variety of computer programming languages.

        ### Variables and Data Types
        Variables are containers for storing data values. Different programming languages support different data types including:
        - Integers (whole numbers)
        - Floating-point numbers (decimals)
        - Strings (text)
        - Booleans (true/false)
        - Arrays (collections of data)

        ### Control Structures
        Control structures determine the flow of program execution:
        - Conditional statements (if/else)
        - Loops (for, while)
        - Functions and procedures
        - Error handling

        This is a simulated extraction from file: ${file.name}
      `;

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      onUpload(simulatedContent);
      
      toast({
        title: "PDF processed successfully!",
        description: `Extracted content from ${file.name}`,
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
          <p className="text-gray-600">Extracting content and analyzing structure</p>
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
