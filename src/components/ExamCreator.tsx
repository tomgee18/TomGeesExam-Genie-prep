
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, BookOpen, ArrowRight } from 'lucide-react';
import { PDFExtractionResult } from '@/lib/pdfProcessor';

interface ExamCreatorProps {
  pdfContent?: PDFExtractionResult;
  onCreateFromPDF: () => void;
  onCreateFromTopics: () => void;
}

const ExamCreator = ({ pdfContent, onCreateFromPDF, onCreateFromTopics }: ExamCreatorProps) => {
  const [selectedMode, setSelectedMode] = useState<'pdf' | 'topics'>('pdf');

  const predefinedTopics = [
    'Computer Science Fundamentals',
    'Programming Concepts',
    'Data Structures & Algorithms',
    'Database Systems',
    'Computer Networks',
    'Software Engineering',
    'Operating Systems',
    'Web Development',
    'Machine Learning Basics',
    'Cybersecurity Fundamentals'
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Create Mock Exam</h2>
        <p className="text-gray-600">Choose how you want to generate your exam questions</p>
      </div>

      <Tabs value={selectedMode} onValueChange={(value) => setSelectedMode(value as 'pdf' | 'topics')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pdf" disabled={!pdfContent}>From Uploaded PDF</TabsTrigger>
          <TabsTrigger value="topics">From Topic Library</TabsTrigger>
        </TabsList>

        <TabsContent value="pdf" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>PDF-Based Exam</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pdfContent ? (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold">Document Information</h4>
                      <p className="text-sm text-gray-600">
                        Pages: {pdfContent.totalPages}
                      </p>
                      <p className="text-sm text-gray-600">
                        Content Sections: {pdfContent.chunks.length}
                      </p>
                      <p className="text-sm text-gray-600">
                        Total Content: {Math.round(pdfContent.fullText.length / 1000)}k characters
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-semibold">Detected Topics</h4>
                      <div className="flex flex-wrap gap-1">
                        {pdfContent.topics.slice(0, 6).map((topic, index) => (
                          <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {topic.substring(0, 30)}...
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <Button onClick={onCreateFromPDF} className="w-full" size="lg">
                    Generate Questions from PDF
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="font-semibold text-gray-600 mb-2">No PDF Uploaded</h4>
                  <p className="text-gray-500 text-sm">
                    Upload a PDF document first to create questions from your study material.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="topics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5" />
                <span>Topic-Based Exam</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Create questions from our curated topic library covering common academic subjects.
              </p>
              
              <div className="grid md:grid-cols-2 gap-2">
                {predefinedTopics.map((topic) => (
                  <div key={topic} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">{topic}</span>
                  </div>
                ))}
              </div>
              
              <Button onClick={onCreateFromTopics} className="w-full" size="lg">
                Create from Topic Library
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExamCreator;
