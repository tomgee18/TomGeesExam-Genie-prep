
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, BookOpen, Clock, Timer, ArrowLeft } from "lucide-react";
import PDFUploader from "@/components/PDFUploader";
import ExamGenerator from "@/components/ExamGenerator";
import ChatAssistant from "@/components/ChatAssistant";
import MockExam from "@/components/MockExam";
import ExamCreator from "@/components/ExamCreator";
import TimedPractice from "@/components/TimedPractice";
import { PDFExtractionResult } from "@/lib/pdfProcessor";

const Index = () => {
  const [currentView, setCurrentView] = useState<'home' | 'creator' | 'generator' | 'chat' | 'exam' | 'timed'>('home');
  const [pdfContent, setPDFContent] = useState<PDFExtractionResult | null>(null);
  const [examConfig, setExamConfig] = useState<any>(null);

  const handlePDFUpload = (result: PDFExtractionResult) => {
    setPDFContent(result);
    console.log('PDF processed:', {
      chunks: result.chunks.length,
      topics: result.topics.length,
      pages: result.totalPages
    });
  };

  const handleStartTimedPractice = (timeLimit: number) => {
    setExamConfig({ timeLimit, mode: 'timed' });
    setCurrentView('exam');
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'creator':
        return (
          <ExamCreator
            pdfContent={pdfContent}
            onCreateFromPDF={() => setCurrentView('generator')}
            onCreateFromTopics={() => setCurrentView('generator')}
          />
        );
      case 'generator':
        return (
          <ExamGenerator 
            content={pdfContent?.fullText || ''} 
            pdfResult={pdfContent}
            onStartExam={() => setCurrentView('exam')} 
          />
        );
      case 'chat':
        return (
          <ChatAssistant 
            content={pdfContent?.fullText || ''} 
            pdfResult={pdfContent}
          />
        );
      case 'exam':
        return (
          <MockExam 
            examConfig={examConfig}
            onComplete={() => setCurrentView('home')} 
          />
        );
      case 'timed':
        return <TimedPractice onStartPractice={handleStartTimedPractice} />;
      default:
        return (
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="text-center space-y-4 py-12">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                MockSmart
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Transform your study materials into intelligent mock exams. Upload PDFs, generate custom questions, and ace your exams with AI-powered preparation.
              </p>
            </div>

            {/* PDF Upload Section */}
            <Card className="border-2 border-dashed border-blue-200 hover:border-blue-400 transition-colors">
              <CardContent className="p-8">
                <PDFUploader onUpload={handlePDFUpload} />
              </CardContent>
            </Card>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-6 mt-12">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setCurrentView('creator')}>
                <CardContent className="p-6 text-center space-y-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <Timer className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold">Mock Exam Generator</h3>
                  <p className="text-gray-600">Generate custom MCQs, fill-in-the-blanks, and true/false questions from your study materials or topic library.</p>
                  <Button className="w-full">
                    Create Exam
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => pdfContent && setCurrentView('chat')}>
                <CardContent className="p-6 text-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <BookOpen className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold">AI Study Assistant</h3>
                  <p className="text-gray-600">Chat with AI about your documents, get explanations, and clarify complex concepts.</p>
                  <Button disabled={!pdfContent} variant="outline" className="w-full">
                    Start Chat
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setCurrentView('timed')}>
                <CardContent className="p-6 text-center space-y-4">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                    <Clock className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold">Timed Practice</h3>
                  <p className="text-gray-600">Simulate real exam conditions with customizable timers and instant feedback.</p>
                  <Button variant="outline" className="w-full">
                    Practice Now
                  </Button>
                </CardContent>
              </Card>
            </div>

            {pdfContent && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-green-700 font-medium">Document processed successfully!</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setPDFContent(null)}>
                      Clear
                    </Button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-green-600">
                    <div>Pages: {pdfContent.totalPages}</div>
                    <div>Sections: {pdfContent.chunks.length}</div>
                    <div>Topics: {pdfContent.topics.length}</div>
                    <div>Characters: {pdfContent.fullText.length.toLocaleString()}</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Navigation */}
      {currentView !== 'home' && (
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <Button variant="outline" onClick={() => setCurrentView('home')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {renderCurrentView()}
      </div>
    </div>
  );
};

export default Index;
