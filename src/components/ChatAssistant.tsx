import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Send, Loader2, User, Bot } from 'lucide-react';
import { PDFExtractionResult } from '@/lib/pdfProcessor';

interface ChatAssistantProps {
  content: string;
  pdfResult: PDFExtractionResult | null;
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const ChatAssistant = ({ content, pdfResult }: ChatAssistantProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: "Hello! I'm your AI study assistant. I've analyzed your uploaded document and I'm ready to help you understand the concepts, clarify doubts, or generate practice questions. What would you like to know?",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    "Summarize the key concepts from this document",
    "What are the main topics covered?",
    "Create 3 practice questions about programming fundamentals",
    "Explain data structures in simple terms",
    "What should I focus on for my exam?"
  ];

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Simulate AI response based on the content
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: generateAIResponse(inputMessage, content),
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error getting AI response:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAIResponse = (question: string, documentContent: string): string => {
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('summary') || lowerQuestion.includes('summarize')) {
      return "Based on your document, here are the key concepts:\n\n• **Computer Science Fundamentals**: The study of computational systems and algorithm design\n• **Programming Basics**: Variables, data types, and control structures\n• **Data Structures**: Arrays, lists, and their applications\n• **Software Development**: Best practices and methodologies\n\nThese topics form the foundation for understanding more advanced computer science concepts.";
    }
    
    if (lowerQuestion.includes('main topics') || lowerQuestion.includes('topics covered')) {
      return "The main topics covered in your document include:\n\n1. **Introduction to Computer Science**\n2. **Programming Fundamentals**\n3. **Data Structures and Algorithms**\n4. **Variables and Data Types**\n5. **Control Structures**\n\nEach topic builds upon the previous ones, creating a comprehensive learning path.";
    }
    
    if (lowerQuestion.includes('practice questions') || lowerQuestion.includes('questions')) {
      return "Here are 3 practice questions based on your document:\n\n**Question 1 (MCQ)**: What is a variable in programming?\na) A fixed value\nb) A container for storing data\nc) A type of loop\nd) A function\n\n**Question 2 (Fill in the blank)**: _______ structures determine the flow of program execution.\n\n**Question 3 (True/False)**: Arrays can only store numbers. (False)\n\nWould you like me to create more questions or explain any of these concepts?";
    }
    
    if (lowerQuestion.includes('data structures')) {
      return "Data structures are ways of organizing and storing data so it can be used efficiently. From your document:\n\n• **Arrays**: Collections of similar data items stored in contiguous memory\n• **Lists**: Dynamic collections that can grow or shrink\n• **Variables**: Basic containers for single data values\n\nThink of data structures like different types of containers - arrays are like egg cartons (fixed size), while lists are like shopping bags (flexible size).";
    }
    
    if (lowerQuestion.includes('exam') || lowerQuestion.includes('focus')) {
      return "For your exam preparation, I recommend focusing on:\n\n**High Priority:**\n• Variable types and declarations\n• Control structures (if/else, loops)\n• Basic data structure concepts\n\n**Medium Priority:**\n• Programming terminology\n• Algorithm basics\n• Problem-solving approaches\n\n**Study Tips:**\n• Practice coding examples\n• Understand concepts, don't just memorize\n• Work through problems step by step\n\nWould you like me to create specific practice problems for any of these areas?";
    }
    
    return `I understand you're asking about "${question}". Based on your uploaded document about computer science fundamentals, I can help explain concepts, create practice questions, or provide study guidance. Could you be more specific about what aspect you'd like to explore? For example, you could ask about specific topics like programming, data structures, or exam preparation strategies.`;
  };

  const handleSuggestedQuestion = (question: string) => {
    setInputMessage(question);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">AI Study Assistant</h2>
        <p className="text-gray-600">Chat with AI about your study materials</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Chat Interface */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bot className="w-5 h-5" />
              <span>Study Chat</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-96 p-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.type === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        {message.type === 'assistant' && (
                          <Bot className="w-4 h-4 mt-1 flex-shrink-0" />
                        )}
                        {message.type === 'user' && (
                          <User className="w-4 h-4 mt-1 flex-shrink-0" />
                        )}
                        <div className="whitespace-pre-line">{message.content}</div>
                      </div>
                      <div className="text-xs opacity-70 mt-2">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <Bot className="w-4 h-4" />
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-gray-600">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            <div className="border-t p-4">
              <div className="flex space-x-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about your study material..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Suggestions Sidebar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5" />
              <span>Quick Questions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600 mb-4">
              Try asking these questions:
            </p>
            {suggestedQuestions.map((question, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="w-full text-left justify-start h-auto py-2 px-3"
                onClick={() => handleSuggestedQuestion(question)}
              >
                <span className="text-xs leading-relaxed">{question}</span>
              </Button>
            ))}
            
            <div className="pt-4 border-t">
              <Badge variant="secondary" className="text-xs">
                Document Analyzed
              </Badge>
              <p className="text-xs text-gray-500 mt-2">
                {content.length} characters processed
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatAssistant;
