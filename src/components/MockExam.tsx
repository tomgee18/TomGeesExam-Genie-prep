
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, Timer } from 'lucide-react';

interface MockExamProps {
  onComplete: () => void;
}

interface Question {
  id: string;
  type: 'mcq' | 'fillblank' | 'truefalse';
  question: string;
  options?: string[];
  answer: string | boolean;
  explanation: string;
}

const MockExam = ({ onComplete }: MockExamProps) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes
  const [showResults, setShowResults] = useState(false);
  const [userAnswer, setUserAnswer] = useState<string>('');

  // Sample questions (in real implementation, these would come from AI generation)
  const questions: Question[] = [
    {
      id: '1',
      type: 'mcq',
      question: 'What is a variable in programming?',
      options: ['A fixed value', 'A container for storing data', 'A type of loop', 'A function'],
      answer: 'A container for storing data',
      explanation: 'Variables are containers that store data values. They can hold different types of data and their values can change during program execution.'
    },
    {
      id: '2',
      type: 'fillblank',
      question: '_______ structures determine the flow of program execution.',
      answer: 'Control',
      explanation: 'Control structures like if statements, loops, and functions determine how a program executes and in what order.'
    },
    {
      id: '3',
      type: 'truefalse',
      question: 'Arrays can only store numbers.',
      answer: false,
      explanation: 'Arrays can store various data types including numbers, strings, booleans, and even other arrays or objects.'
    },
    {
      id: '4',
      type: 'mcq',
      question: 'Which of the following is NOT a programming control structure?',
      options: ['if-else statement', 'for loop', 'variable declaration', 'while loop'],
      answer: 'variable declaration',
      explanation: 'Variable declaration is used to create variables, not to control program flow. Control structures include conditionals and loops.'
    },
    {
      id: '5',
      type: 'fillblank',
      question: 'In programming, _______ are collections of similar data items stored in contiguous memory.',
      answer: 'Arrays',
      explanation: 'Arrays are data structures that store multiple values of the same type in consecutive memory locations.'
    }
  ];

  // Timer effect
  useEffect(() => {
    if (timeLeft > 0 && !showResults) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      handleSubmitExam();
    }
  }, [timeLeft, showResults]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (answer: string | boolean) => {
    setUserAnswer(answer.toString());
    setAnswers({ ...answers, [questions[currentQuestion].id]: answer });
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setUserAnswer(answers[questions[currentQuestion + 1]?.id] || '');
    } else {
      handleSubmitExam();
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setUserAnswer(answers[questions[currentQuestion - 1].id] || '');
    }
  };

  const handleSubmitExam = () => {
    setShowResults(true);
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach(question => {
      const userAnswer = answers[question.id];
      if (userAnswer === question.answer) {
        correct++;
      }
    });
    return { correct, total: questions.length, percentage: Math.round((correct / questions.length) * 100) };
  };

  const getAnswerStatus = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    const userAnswer = answers[questionId];
    if (!question) return 'unanswered';
    return userAnswer === question.answer ? 'correct' : 'incorrect';
  };

  if (showResults) {
    const score = calculateScore();
    
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Exam Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <div className="text-6xl font-bold text-blue-600">
                {score.percentage}%
              </div>
              <p className="text-lg text-gray-600">
                You scored {score.correct} out of {score.total} questions correctly
              </p>
              <div className="flex justify-center space-x-4">
                <Badge variant={score.percentage >= 80 ? "default" : score.percentage >= 60 ? "secondary" : "destructive"}>
                  {score.percentage >= 80 ? "Excellence" : score.percentage >= 60 ? "Good" : "Needs Improvement"}
                </Badge>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Question Review</h3>
              {questions.map((question, index) => {
                const status = getAnswerStatus(question.id);
                const userAnswer = answers[question.id];
                
                return (
                  <Card key={question.id} className="border-l-4 border-l-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">Question {index + 1}</h4>
                        <div className="flex items-center space-x-2">
                          {status === 'correct' ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                          <Badge variant={status === 'correct' ? 'default' : 'destructive'}>
                            {status}
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="mb-3">{question.question}</p>
                      
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Your answer: </span>
                          <span className={status === 'correct' ? 'text-green-600' : 'text-red-600'}>
                            {userAnswer?.toString() || 'Not answered'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Correct answer: </span>
                          <span className="text-green-600">{question.answer.toString()}</span>
                        </div>
                        <div className="bg-blue-50 p-2 rounded">
                          <span className="font-medium">Explanation: </span>
                          {question.explanation}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="text-center">
              <Button onClick={onComplete} size="lg">
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Badge variant="outline">
                Question {currentQuestion + 1} of {questions.length}
              </Badge>
              <Badge variant="secondary" className="capitalize">
                {question.type === 'mcq' ? 'Multiple Choice' : 
                 question.type === 'fillblank' ? 'Fill in the Blank' : 'True/False'}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2 text-orange-600">
              <Timer className="w-4 h-4" />
              <span className="font-mono font-semibold">{formatTime(timeLeft)}</span>
            </div>
          </div>
          
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Question */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{question.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {question.type === 'mcq' && question.options && (
            <div className="space-y-2">
              {question.options.map((option, index) => (
                <Button
                  key={index}
                  variant={userAnswer === option ? "default" : "outline"}
                  className="w-full text-left justify-start h-auto py-3 px-4"
                  onClick={() => handleAnswerChange(option)}
                >
                  <span className="font-medium mr-3">{String.fromCharCode(65 + index)}.</span>
                  {option}
                </Button>
              ))}
            </div>
          )}

          {question.type === 'fillblank' && (
            <div>
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => handleAnswerChange(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Type your answer here..."
              />
            </div>
          )}

          {question.type === 'truefalse' && (
            <div className="flex space-x-4">
              <Button
                variant={userAnswer === 'true' ? "default" : "outline"}
                className="flex-1 py-3"
                onClick={() => handleAnswerChange(true)}
              >
                True
              </Button>
              <Button
                variant={userAnswer === 'false' ? "default" : "outline"}
                className="flex-1 py-3"
                onClick={() => handleAnswerChange(false)}
              >
                False
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevQuestion}
              disabled={currentQuestion === 0}
            >
              ← Previous
            </Button>
            
            <div className="flex space-x-2">
              {currentQuestion === questions.length - 1 ? (
                <Button onClick={handleSubmitExam} className="bg-green-600 hover:bg-green-700">
                  Submit Exam
                </Button>
              ) : (
                <Button onClick={handleNextQuestion}>
                  Next →
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MockExam;
