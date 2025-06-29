import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Settings, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PDFExtractionResult } from '@/lib/pdfProcessor';

interface ExamGeneratorProps {
  content: string;
  pdfResult: PDFExtractionResult | null;
  onStartExam: () => void;
}

const ExamGenerator = ({ content, pdfResult, onStartExam }: ExamGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [mcqCount, setMcqCount] = useState([5]);
  const [fillBlankCount, setFillBlankCount] = useState([3]);
  const [trueFalseCount, setTrueFalseCount] = useState([2]);
  const [difficulty, setDifficulty] = useState('intermediate');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [timeLimit, setTimeLimit] = useState([30]);
  const { toast } = useToast();

  // Use topics from PDF if available, otherwise use default topics
  const extractedTopics = pdfResult?.topics.length 
    ? pdfResult.topics 
    : [
        'Introduction to Computer Science',
        'Programming Fundamentals',
        'Data Structures',
        'Variables and Data Types',
        'Control Structures'
      ];

  const handleTopicToggle = (topic: string) => {
    setSelectedTopics(prev => 
      prev.includes(topic) 
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  };

  const handleGenerateExam = async () => {
    if (selectedTopics.length === 0) {
      toast({
        title: "Select topics",
        description: "Please select at least one topic to generate questions from.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      // Simulate exam generation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast({
        title: "Exam generated successfully!",
        description: `Created ${mcqCount[0] + fillBlankCount[0] + trueFalseCount[0]} questions`,
      });
      
      onStartExam();
    } catch (error) {
      console.error('Error generating exam:', error);
      toast({
        title: "Error generating exam",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const totalQuestions = mcqCount[0] + fillBlankCount[0] + trueFalseCount[0];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Generate Mock Exam</h2>
        <p className="text-gray-600">Customize your exam settings and generate AI-powered questions</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Question Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Question Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Multiple Choice Questions: {mcqCount[0]}</Label>
              <Slider
                value={mcqCount}
                onValueChange={setMcqCount}
                min={0}
                max={20}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <Label>Fill in the Blanks: {fillBlankCount[0]}</Label>
              <Slider
                value={fillBlankCount}
                onValueChange={setFillBlankCount}
                min={0}
                max={15}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <Label>True/False Questions: {trueFalseCount[0]}</Label>
              <Slider
                value={trueFalseCount}
                onValueChange={setTrueFalseCount}
                min={0}
                max={10}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <Label>Difficulty Level</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Time Limit (minutes): {timeLimit[0]}</Label>
              <Slider
                value={timeLimit}
                onValueChange={setTimeLimit}
                min={10}
                max={120}
                step={5}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Topic Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5" />
              <span>Select Topics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Choose which topics to include in your exam:
            </p>
            
            <div className="space-y-3">
              {extractedTopics.map((topic) => (
                <div key={topic} className="flex items-center space-x-2">
                  <Checkbox
                    id={topic}
                    checked={selectedTopics.includes(topic)}
                    onCheckedChange={() => handleTopicToggle(topic)}
                  />
                  <Label htmlFor={topic} className="text-sm cursor-pointer">
                    {topic}
                  </Label>
                </div>
              ))}
            </div>

            {selectedTopics.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">Selected Topics:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTopics.map((topic) => (
                    <Badge key={topic} variant="secondary">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary and Generate */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold">Exam Summary</h3>
              <p className="text-sm text-gray-600">
                {totalQuestions} questions • {timeLimit[0]} minutes • {difficulty} difficulty
              </p>
              <p className="text-xs text-gray-500">
                {selectedTopics.length} topics selected
              </p>
            </div>
            
            <Button 
              onClick={handleGenerateExam}
              disabled={isGenerating || totalQuestions === 0}
              size="lg"
              className="min-w-32"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Exam'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExamGenerator;
