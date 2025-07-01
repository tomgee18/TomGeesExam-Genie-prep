// API Key Management:
// This module now expects the API key to be passed into its functions.
// The responsibility of obtaining and storing the API key lies with the calling code (e.g., UI components or a central state management).
// For development, a user might input it. For production, a backend proxy is the most secure.

// const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";
// Using gemini-1.5-flash for potentially faster and cheaper responses, though quality might vary. Adjust as needed.
const GEMINI_API_MODEL = "gemini-1.5-flash-latest"; // or "gemini-pro" or other compatible models

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

const callGeminiApi = async (apiKey: string, prompt: string): Promise<string> => {
  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE" || apiKey.trim() === "") {
    throw new Error("A valid Gemini API key is required. Please provide one.");
  }
  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_API_MODEL}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }],
        }],
        // Optional: Add generationConfig or safetySettings if needed
        // generationConfig: {
        //   temperature: 0.7,
        //   topK: 1,
        //   topP: 1,
        //   maxOutputTokens: 8192,
        // },
        // safetySettings: [
        //   { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        //   // ... other safety settings
        // ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      console.error('Gemini API Error Response:', errorData);
      throw new Error(`Gemini API Error: ${response.status} ${errorData.error?.message || errorData.message || 'Unknown error'}`);
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text) {
      console.error('Gemini API Unexpected Response Format:', data);
      throw new Error('Gemini API Error: Unexpected response format or empty content.');
    }
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    if (error instanceof Error && error.message.startsWith('Gemini API Error:')) {
      throw error;
    }
    throw new Error(`Failed to connect to Gemini API: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Helper function to parse MCQ questions from text
// This is a simplified parser and might need to be very robust for production
const parseMCQText = (textBlock: string, count: number): Omit<GeminiQuestion, 'id' | 'type'>[] => {
  const questions: Omit<GeminiQuestion, 'id' | 'type'>[] = [];
  const questionRegex = /(\d+)\.\s(.*?)\nA\)\s(.*?)\nB\)\s(.*?)\nC\)\s(.*?)\nD)\s(.*?)\nAnswer:\s([A-D])\)\s(.*?)\nExplanation:\s(.*?)(?=\n\d+\.|\n\n|$)/gs;
  let match;
  let parsedCount = 0;
  while ((match = questionRegex.exec(textBlock)) !== null && parsedCount < count) {
    questions.push({
      question: match[2].trim(),
      options: [match[3].trim(), match[4].trim(), match[5].trim(), match[6].trim()],
      answer: `${match[7]}) ${match[8].trim()}`, // Store answer like "A) Option text"
      explanation: match[9].trim(),
    });
    parsedCount++;
  }
  // If parsing fails to get enough questions, add placeholders (or handle error more gracefully)
  while(questions.length < count) {
    questions.push({ question: "Failed to parse MCQ", options: ["","","",""], answer: "", explanation: "Parsing error or insufficient model output."});
  }
  return questions.slice(0, count);
};

// Helper function to parse Fill-in-the-blank questions
const parseFillBlankText = (textBlock: string, count: number): Omit<GeminiQuestion, 'id' | 'type'>[] => {
  const questions: Omit<GeminiQuestion, 'id' | 'type'>[] = [];
  const questionRegex = /(\d+)\.\s(.*?)\nAnswer:\s(.*?)\nExplanation:\s(.*?)(?=\n\d+\.|\n\n|$)/gs;
  let match;
  let parsedCount = 0;
  while ((match = questionRegex.exec(textBlock)) !== null && parsedCount < count) {
    questions.push({
      question: match[2].trim(),
      answer: match[3].trim(),
      explanation: match[4].trim(),
    });
    parsedCount++;
  }
  while(questions.length < count) {
    questions.push({ question: "Failed to parse Fill-Blank", answer: "", explanation: "Parsing error or insufficient model output."});
  }
  return questions.slice(0, count);
};

// Helper function to parse True/False questions
const parseTrueFalseText = (textBlock: string, count: number): Omit<GeminiQuestion, 'id' | 'type'>[] => {
  const questions: Omit<GeminiQuestion, 'id' | 'type'>[] = [];
  const questionRegex = /(\d+)\.\s(.*?)\nAnswer:\s(True|False)\nExplanation:\s(.*?)(?=\n\d+\.|\n\n|$)/gis;
  let match;
  let parsedCount = 0;
  while ((match = questionRegex.exec(textBlock)) !== null && parsedCount < count) {
    questions.push({
      question: match[2].trim(),
      answer: match[3].toLowerCase() === 'true',
      explanation: match[4].trim(),
    });
    parsedCount++;
  }
   while(questions.length < count) {
    questions.push({ question: "Failed to parse T/F", answer: false, explanation: "Parsing error or insufficient model output."});
  }
  return questions.slice(0, count);
};


const createQuestionGenerationPrompt = (contentChunk: string, mcq: number, fill: number, tf: number, difficulty: string): string => {
  return `Based on the following academic content, generate exactly:
- ${mcq} multiple choice questions
- ${fill} fill-in-the-blank questions
- ${tf} true/false questions
All questions should be at a ${difficulty} difficulty level.

Content:
"""
${contentChunk}
"""

For each question, provide:
- Multiple Choice: Question, 4 options (labeled A, B, C, D), the correct option letter followed by the answer text (e.g., "A) Correct Answer Text"), and a brief explanation. Format strictly as:
  1. Question text?
  A) Option 1
  B) Option 2
  C) Option 3
  D) Option 4
  Answer: A) Option 1 Text
  Explanation: Why it's correct.

- Fill-in-the-blank: Question with "_______" for the blank, the correct answer, and a brief explanation. Format strictly as:
  1. Question with _______ blank.
  Answer: The Answer
  Explanation: Why it's correct.

- True/False: Statement, the correct answer (True or False), and a brief explanation. Format strictly as:
  1. Statement.
  Answer: True
  Explanation: Why it's true/false.

Ensure distinct numbering for each question type if generated together, or assume separate calls for each type. Adhere strictly to the requested numbers of questions for each type.
`;
};


export const generateQuestions = async (
  apiKey: string,
  content: string,
  request: QuestionGenerationRequest,
  onProgress?: (progress: { value: number; message: string }) => void
): Promise<GeminiQuestion[]> => {
  if (!apiKey) throw new Error("API Key is required for generating questions.");
  const allQuestions: GeminiQuestion[] = [];
  let questionId = 1;

  const { mcqCount, fillBlankCount, trueFalseCount, difficulty } = request;

  // For simplicity and potentially better results with current parsing,
  // we make separate API calls for each question type.
  // A more advanced approach might try to get all in one call and parse a complex mixed response.

  if (mcqCount > 0) {
    onProgress?.({ value: 10, message: `Generating ${mcqCount} MCQs...` });
    const prompt = createQuestionGenerationPrompt(content, mcqCount, 0, 0, difficulty);
    try {
      const responseText = await callGeminiApi(apiKey, prompt);
      onProgress?.({ value: 30, message: "Parsing MCQs..." });
      const parsedMcqs = parseMCQText(responseText, mcqCount);
      parsedMcqs.forEach(q => allQuestions.push({ ...q, id: `mcq_${questionId++}`, type: 'mcq' }));
    } catch (error) {
      console.error("Failed to generate or parse MCQs:", error);
      for (let i = 0; i < mcqCount; i++) { // Add placeholders on error
        allQuestions.push({ id: `mcq_err_${questionId++}`, type: 'mcq', question: "Error generating MCQ", options: [], answer: "", explanation: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  if (fillBlankCount > 0) {
    onProgress?.({ value: 40, message: `Generating ${fillBlankCount} Fill-in-the-blank questions...` });
    const prompt = createQuestionGenerationPrompt(content, 0, fillBlankCount, 0, difficulty);
     try {
      const responseText = await callGeminiApi(apiKey, prompt);
      onProgress?.({ value: 60, message: "Parsing Fill-in-the-blank questions..." });
      const parsedFillBlanks = parseFillBlankText(responseText, fillBlankCount);
      parsedFillBlanks.forEach(q => allQuestions.push({ ...q, id: `fill_${questionId++}`, type: 'fillblank' }));
    } catch (error) {
      console.error("Failed to generate or parse Fill-in-the-blanks:", error);
       for (let i = 0; i < fillBlankCount; i++) {
        allQuestions.push({ id: `fill_err_${questionId++}`, type: 'fillblank', question: "Error generating Fill-blank", answer: "", explanation: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  if (trueFalseCount > 0) {
    onProgress?.({ value: 70, message: `Generating ${trueFalseCount} True/False questions...` });
    const prompt = createQuestionGenerationPrompt(content, 0, 0, trueFalseCount, difficulty);
    try {
      const responseText = await callGeminiApi(apiKey, prompt);
      onProgress?.({ value: 90, message: "Parsing True/False questions..." });
      const parsedTrueFalse = parseTrueFalseText(responseText, trueFalseCount);
      parsedTrueFalse.forEach(q => allQuestions.push({ ...q, id: `tf_${questionId++}`, type: 'truefalse' }));
    } catch (error) {
      console.error("Failed to generate or parse True/False questions:", error);
      for (let i = 0; i < trueFalseCount; i++) {
        allQuestions.push({ id: `tf_err_${questionId++}`, type: 'truefalse', question: "Error generating T/F", answer: false, explanation: error instanceof Error ? error.message : String(error) });
      }
    }
  }
  
  onProgress?.({ value: 100, message: "Question generation complete." });
  return allQuestions;
};

export const chatWithContent = async (
  apiKey: string,
  documentContent: string,
  userQuestion: string,
  onProgress?: (progress: { value: number; message: string }) => void
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is required for chat.");
  onProgress?.({ value: 20, message: "Formulating response..." });
  
  const chatPrompt = `You are a helpful academic tutor. Answer the following Student Question based ONLY on the provided Study Material.
Be clear, concise, and educational. If the answer is not in the material, say so.

Study Material:
"""
${documentContent}
"""

Student Question:
"""
${userQuestion}
"""

Answer:`;
  
  try {
    onProgress?.({ value: 50, message: "Getting response from AI..." });
    const responseText = await callGeminiApi(apiKey, chatPrompt);
    onProgress?.({ value: 100, message: "Response received." });
    return responseText;
  } catch (error) {
     console.error("Failed to get chat response:", error);
     if (error instanceof Error) {
        // Return the error message to be displayed in chat
        return `Error communicating with AI: ${error.message}`;
     }
     return "An unexpected error occurred while trying to get a chat response.";
  }
};

// Old createQuestionPrompt - replaced by createQuestionGenerationPrompt for clarity
// const createQuestionPrompt = (content: string, request: QuestionGenerationRequest): string => {
//   return `You are an expert exam preparation assistant. Based on the following academic content, generate exactly ${request.mcqCount} multiple choice questions, ${request.fillBlankCount} fill-in-the-blank questions, and ${request.trueFalseCount} true/false questions at ${request.difficulty} difficulty level.

// Content:
// ${content}

// For each question type, provide:
// - Multiple Choice: Question, 4 options (A, B, C, D), correct answer, explanation
// - Fill-in-the-blank: Question with blank, correct answer, explanation
// - True/False: Statement, correct answer (True/False), explanation

// Format each question clearly and provide educational explanations for learning.`;
// };
