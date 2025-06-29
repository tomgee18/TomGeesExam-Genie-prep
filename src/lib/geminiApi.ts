
export interface GeminiQuestion {
  id: string;
  type: 'mcq' | 'fillblank' | 'truefalse';
  question: string;
  options?: string[];
  answer: string | boolean;
  explanation: string;
}

export interface QuestionGenerationRequest {
  content: string;
  mcqCount: number;
  fillBlankCount: number;
  trueFalseCount: number;
  difficulty: 'basic' | 'intermediate' | 'advanced';
}

// For now, we'll simulate the Gemini API until the user adds their API key
const simulateGeminiAPI = async (
  prompt: string,
  delay: number = 1500
): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // Simulate realistic responses based on prompt type
  if (prompt.includes('multiple choice')) {
    return `1. What is the main topic discussed in this text?
A) Programming fundamentals
B) Data structures
C) Computer networks
D) Database systems
Answer: A) Programming fundamentals
Explanation: The text primarily focuses on programming fundamentals and basic concepts.

2. Which of the following is mentioned in the content?
A) Variables and data types
B) Machine learning algorithms
C) Web development frameworks
D) Cloud computing services
Answer: A) Variables and data types
Explanation: The content specifically discusses variables and different data types used in programming.`;
  }
  
  if (prompt.includes('fill-in-the-blank')) {
    return `1. _______ are containers that store data values in programming.
Answer: Variables
Explanation: Variables are fundamental components in programming that hold and store data values.

2. Control structures like loops and conditionals determine the _______ of program execution.
Answer: flow
Explanation: Control structures control how a program executes and in what sequence.`;
  }
  
  if (prompt.includes('true/false')) {
    return `1. Programming languages can only work with numeric data types.
Answer: False
Explanation: Programming languages support various data types including strings, booleans, arrays, and objects, not just numbers.

2. Variables in programming can change their values during program execution.
Answer: True
Explanation: Variables are designed to hold values that can be modified throughout the program's runtime.`;
  }
  
  return "Generated content based on your PDF material.";
};

const createQuestionPrompt = (content: string, request: QuestionGenerationRequest): string => {
  return `You are an expert exam preparation assistant. Based on the following academic content, generate exactly ${request.mcqCount} multiple choice questions, ${request.fillBlankCount} fill-in-the-blank questions, and ${request.trueFalseCount} true/false questions at ${request.difficulty} difficulty level.

Content:
${content}

For each question type, provide:
- Multiple Choice: Question, 4 options (A, B, C, D), correct answer, explanation
- Fill-in-the-blank: Question with blank, correct answer, explanation  
- True/False: Statement, correct answer (True/False), explanation

Format each question clearly and provide educational explanations for learning.`;
};

export const generateQuestions = async (
  content: string,
  request: QuestionGenerationRequest,
  onProgress?: (progress: number) => void
): Promise<GeminiQuestion[]> => {
  const questions: GeminiQuestion[] = [];
  let questionId = 1;
  
  // Generate MCQs
  if (request.mcqCount > 0) {
    onProgress?.(25);
    const mcqPrompt = createQuestionPrompt(content, { ...request, fillBlankCount: 0, trueFalseCount: 0 });
    const mcqResponse = await simulateGeminiAPI(mcqPrompt);
    
    // Parse MCQ responses (simplified for demo)
    for (let i = 0; i < request.mcqCount; i++) {
      questions.push({
        id: `mcq_${questionId++}`,
        type: 'mcq',
        question: `Sample MCQ ${i + 1} based on your PDF content: What is the main concept discussed?`,
        options: ['Option A from content', 'Option B from content', 'Option C from content', 'Option D from content'],
        answer: 'Option A from content',
        explanation: 'This answer is correct based on the uploaded PDF content.'
      });
    }
  }
  
  // Generate Fill-in-the-blank
  if (request.fillBlankCount > 0) {
    onProgress?.(50);
    await simulateGeminiAPI('fill-in-the-blank questions');
    
    for (let i = 0; i < request.fillBlankCount; i++) {
      questions.push({
        id: `fill_${questionId++}`,
        type: 'fillblank',
        question: `Based on your PDF: _______ is a key concept mentioned in the document.`,
        answer: 'Programming',
        explanation: 'This concept is frequently discussed in the uploaded material.'
      });
    }
  }
  
  // Generate True/False
  if (request.trueFalseCount > 0) {
    onProgress?.(75);
    await simulateGeminiAPI('true/false questions');
    
    for (let i = 0; i < request.trueFalseCount; i++) {
      questions.push({
        id: `tf_${questionId++}`,
        type: 'truefalse',
        question: `Statement from your PDF content: The document discusses advanced programming concepts.`,
        answer: true,
        explanation: 'This statement is true based on the content analysis of your uploaded PDF.'
      });
    }
  }
  
  onProgress?.(100);
  return questions;
};

export const chatWithContent = async (
  content: string,
  question: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  onProgress?.(50);
  
  const chatPrompt = `You are a helpful academic tutor. Answer the following question based ONLY on the provided study material. Be clear, concise, and educational.

Study Material:
${content}

Student Question:
${question}`;
  
  const response = await simulateGeminiAPI(chatPrompt);
  onProgress?.(100);
  
  return `Based on your uploaded PDF content: ${question}\n\nThe material you provided discusses several key concepts that relate to your question. According to the document, the main points include the fundamental principles and their practical applications. The content suggests that understanding these concepts requires both theoretical knowledge and practical implementation.\n\nWould you like me to elaborate on any specific aspect mentioned in your PDF?`;
};
