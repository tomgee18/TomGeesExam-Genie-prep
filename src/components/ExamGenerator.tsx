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
import { PDFExtractionResult, EnhancedPDFResult } from '@/lib/enhancedPdfProcessor'; // Assuming pdfResult is EnhancedPDFResult
import { generateQuestions, GeminiQuestion, QuestionGenerationRequest } from '@/lib/geminiApi';
import { Progress } from '@/components/ui/progress'; // For showing generation progress

interface ExamGeneratorProps {
  apiKey: string; // Added apiKey prop
  content: string;
  pdfResult: EnhancedPDFResult | null;
  onStartExam: (questions: GeminiQuestion[], timeLimitMinutes: number) => void;
}

const ExamGenerator = ({ apiKey, content, pdfResult, onStartExam }: ExamGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{value: number, message: string} | null>(null);
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
    setGenerationProgress({ value: 0, message: "Preparing to generate..."});
    
    // Content strategy: For now, use the full text.
    // A future improvement: Filter content based on selectedTopics.
    // This would require matching selectedTopics (strings) to pdfResult.chunks,
    // potentially by looking at chunk headings or using a more sophisticated mapping.
    // const relevantContent = selectedTopics.length > 0 && pdfResult?.chunks
    //   ? pdfResult.chunks
    //       .filter(chunk => selectedTopics.some(topic => chunk.content.toLowerCase().includes(topic.toLowerCase()))) // Naive topic matching
    //       .map(chunk => chunk.content)
    //       .join("\n\n") || content // Fallback to full content if no chunks match
    //   : content;

    const request: QuestionGenerationRequest = {
      content: content, // Using full content passed as prop for now
      mcqCount: mcqCount[0],
      fillBlankCount: fillBlankCount[0],
      trueFalseCount: trueFalseCount[0],
      difficulty: difficulty as 'basic' | 'intermediate' | 'advanced',
    };

    if (!apiKey) {
      toast({
        title: "API Key Missing",
        description: "Please provide a Gemini API key in the settings on the home page.",
        variant: "destructive",
      });
      setIsGenerating(false);
      setGenerationProgress(null);
      return;
    }

    try {
      const generatedQuestions = await generateQuestions(
        apiKey, // Pass the apiKey
        request.content,
        request,
        (progress) => setGenerationProgress(progress)
      );
      
      toast({
        title: "Exam generated successfully!",
        description: `Created ${generatedQuestions.length} questions.`,
      });
      
      // Pass generated questions and time limit to the parent component
      onStartExam(generatedQuestions, timeLimit[0]);

    } catch (error) {
      console.error('Error generating exam:', error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        title: "Error Generating Exam",
        description: errorMessage,
        variant: "destructive",
      });
      setGenerationProgress(null); // Clear progress on error
    } finally {
      setIsGenerating(false);
      // Optionally clear progress after a delay or keep it to show completion/error
      // setTimeout(() => setGenerationProgress(null), 3000);
    }
  };

  const totalQuestions = mcqCount[0] + fillBlankCount[0] + trueFalseCount[0];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Generate Mock Exam</h2>
        <p className="text-muted-foreground">Customize your exam settings and generate AI-powered questions</p>
      </div>

      {isGenerating && generationProgress && (
        <Card>
          <CardContent className="p-4">
            <Label className="text-sm font-medium">{generationProgress.message}</Label>
            <Progress value={generationProgress.value} className="w-full mt-2" />
            <p className="text-xs text-muted-foreground mt-1 text-center">{generationProgress.value}% complete</p>
          </CardContent>
        </Card>
      )}

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
              <Label htmlFor="mcq-slider">Multiple Choice Questions: {mcqCount[0]}</Label>
              <Slider
                id="mcq-slider"
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
