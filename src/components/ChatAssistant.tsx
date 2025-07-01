import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Send, Loader2, User, Bot } from 'lucide-react';
// Assuming pdfResult will be EnhancedPDFResult from Index.tsx
import { EnhancedPDFResult } from '@/lib/enhancedPdfProcessor';
import { chatWithContent } from '@/lib/geminiApi';
import { useToast } from '@/hooks/use-toast';


interface ChatAssistantProps {
  apiKey: string; // Added apiKey prop
  content: string;
  pdfResult: EnhancedPDFResult | null;
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const ChatAssistant = ({ apiKey, content, pdfResult }: ChatAssistantProps) => {
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
  const [chatProgress, setChatProgress] = useState<{ value: number; message: string } | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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
    setChatProgress({ value: 0, message: "Sending..." });

    if (!apiKey) {
      const errorResponseMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "API Key is missing. Please set it on the home page to use the chat assistant.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponseMessage]);
      setIsLoading(false);
      setChatProgress(null);
      toast({
        title: "API Key Missing",
        description: "Please provide a Gemini API key to use the chat assistant.",
        variant: "destructive",
      });
      return;
    }

    try {
      const assistantResponseText = await chatWithContent(
        apiKey, // Use the apiKey prop
        content,
        userMessage.content,
        (progress) => setChatProgress(progress)
      );

      const aiResponseMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: assistantResponseText, // This will include error messages from geminiApi.ts
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponseMessage]);

      // If the response text itself indicates an error propagated from geminiApi.ts,
      // we might not need an additional toast, as it's already in the chat.
      if (assistantResponseText.startsWith("Error communicating with AI:") ||
          assistantResponseText.startsWith("Sorry, I encountered an error:")) {
        // Optionally, still show a toast for critical API errors if desired,
        // but it might be redundant if the error is clearly in chat.
        // For now, let the error message in chat suffice.
      }

    } catch (error) {
      // This catch block handles errors thrown by chatWithContent if it doesn't return a string
      // (e.g., API key not provided error before the actual API call attempt in chatWithContent)
      // or other unexpected errors within this component's try block.
      console.error('Error in handleSendMessage:', error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";

      // Add error message to chat
      const errorChatMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Sorry, an application error occurred: ${errorMessage}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorChatMsg]);

      // Also show a toast for these types of errors
      toast({
        title: "Chat Application Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setChatProgress(null);
    }
  };

  // const generateAIResponse = (question: string, documentContent: string): string => { ... } // This function is now removed

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
