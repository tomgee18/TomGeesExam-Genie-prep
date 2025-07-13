
import PDFUploader from './PDFUploader/PDFUploader';

interface EnhancedPDFUploaderProps {
  onUpload: (result: EnhancedPDFResult) => void;
}

const EnhancedPDFUploader = ({ onUpload }: EnhancedPDFUploaderProps) => {
  return <PDFUploader onUpload={onUpload} />;
};

export default EnhancedPDFUploader;
