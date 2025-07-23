// API Key Management:
// This module now expects the API key to be passed into its functions.
// The responsibility of obtaining and storing the API key lies with the calling code (e.g., UI components or a central state management).
// For development, a user might input it. For production, a backend proxy is the most secure.

// const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";
// Using gemini-1.5-flash for potentially faster and cheaper responses, though quality might vary. Adjust as needed.
const GEMINI_API_MODEL = "gemini-1.5-flash-latest"; // or "gemini-pro" or other compatible models
const CHAR_PER_TOKEN_ESTIMATE = 4; // General heuristic for English text
const MAX_TOKENS_PER_CHUNK_QUESTION_GEN = 7000; // Max tokens to aim for per chunk for question generation (gemini-1.5-flash has large context, but smaller is better for focused Qs)
                                           // Gemini 1.0 Pro was ~8k input tokens. Flash 1.5 is 1M. Let's be conservative.
                                           // The prompt itself also consumes tokens.

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

const MAX_RETRIES = 2;
const INITIAL_RETRY_DELAY_MS = 1000;

const callGeminiApi = async (apiKey: string, prompt: string, attempt: number = 1): Promise<string> => {
  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE" || apiKey.trim() === "") {
    // This error should ideally be caught before calling if API key comes from user input
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
        contents: [{ parts: [{ text: prompt }] }],
        // Consider adding safetySettings if not globally configured for the API key
        // safetySettings: [
        //   { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        //   { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        //   { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        //   { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        // ],
      }),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        // If parsing error response fails, use status text
        errorData = { error: { message: response.statusText } };
      }

      console.error('Gemini API Error Response:', { status: response.status, data: errorData });

      // Retry logic for specific server-side errors or rate limits
      if ((response.status === 429 || response.status >= 500) && attempt <= MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(`Gemini API Error (Status ${response.status}). Retrying attempt ${attempt + 1}/${MAX_RETRIES} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return callGeminiApi(apiKey, prompt, attempt + 1);
      }

      // Map status codes to user-friendly messages
      let userMessage = `API Error (${response.status}): ${errorData.error?.message || 'An unknown error occurred with the AI service.'}`;
      if (response.status === 400) {
        userMessage = `There was an issue with the request sent to the AI service (Error 400). Details: ${errorData.error?.message || 'Invalid request.'}`;
        if (errorData.error?.message?.includes("API key not valid")) {
            userMessage = "The provided API key is not valid. Please check your API key and try again.";
        } else if (errorData.error?.message?.includes("billing")){
            userMessage = "There might be an issue with billing for your API key or the free tier is not available in your region. Please check your Google AI Studio project settings.";
        }
      } else if (response.status === 403) {
        userMessage = "The API key does not have the required permissions, or is incorrect (Error 403). Please check your API key.";
      } else if (response.status === 429) {
        userMessage = "The AI service is currently busy or rate limits have been exceeded (Error 429). Please try again in a few moments.";
      } else if (response.status >= 500) {
        userMessage = `The AI service encountered a temporary issue (Error ${response.status}). Please try again shortly.`;
      }
      throw new Error(userMessage);
    }

    const data = await response.json();

    // Handle cases where the prompt or response was blocked due to safety settings
    if (data.promptFeedback?.blockReason) {
      console.warn('Gemini API: Prompt blocked due to safety settings:', data.promptFeedback.blockReason);
      throw new Error(`Your request was blocked by the AI's safety filters (Reason: ${data.promptFeedback.blockReason}). Please revise your input.`);
    }
    if (!data.candidates || data.candidates.length === 0) {
        if(data.candidates && data.candidates[0]?.finishReason === "SAFETY") {
             console.warn('Gemini API: Response candidate blocked due to safety settings.');
             throw new Error("The AI's response was blocked due to safety filters. Try rephrasing your request or adjusting safety settings if possible.");
        }
      console.error('Gemini API Unexpected Response Format: No candidates.', data);
      throw new Error('The AI service returned an empty or unexpected response. Please try again.');
    }
    if (!data.candidates[0].content?.parts[0]?.text) {
       // Check if the content is missing because of a finish reason like SAFETY
      if (data.candidates[0].finishReason && data.candidates[0].finishReason !== "STOP") {
        console.warn(`Gemini API: Candidate finished with reason: ${data.candidates[0].finishReason}`);
        throw new Error(`The AI couldn't generate a response (Reason: ${data.candidates[0].finishReason}). This might be due to safety filters or other limitations. Please try modifying your request.`);
      }
      console.error('Gemini API Unexpected Response Format: Missing text in content part.', data);
      throw new Error('The AI service returned an improperly formatted response. Please try again.');
    }

    return data.candidates[0].content.parts[0].text;

  } catch (error) {
    console.error('Error calling Gemini API (outer catch):', error);
    if (error instanceof Error && (error.message.startsWith('API Error') || error.message.startsWith('The AI') || error.message.startsWith('Your request was blocked') || error.message.startsWith("A valid Gemini API key"))) {
      throw error; // Re-throw known, user-friendly errors
    }
    // For other errors (e.g., network issues), provide a generic message
    throw new Error(`Failed to connect to the AI service. Please check your internet connection and try again. (${error instanceof Error ? error.message : String(error)})`);
  }
};

import { estimateTokens } from './utils/memoization-utils';

import { splitContentIntoChunks } from './utils/memoization-utils';


import { parseMCQText } from './gemini-questions/mcq-parser';
import { parseFillBlankText } from './gemini-questions/fillblank-parser';
import { parseTrueFalseText } from './gemini-questions/tf-parser';


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

  const allGeneratedQuestions: GeminiQuestion[] = [];
  let overallQuestionId = 1;

  const { difficulty } = request;
  const totalQuestionsRequested = request.mcqCount + request.fillBlankCount + request.trueFalseCount;

  if (totalQuestionsRequested === 0) {
    onProgress?.({ value: 100, message: "No questions requested."});
    return [];
  }

  onProgress?.({ value: 5, message: "Preparing content..." });
  const contentChunks = splitContentIntoChunks(content, MAX_TOKENS_PER_CHUNK_QUESTION_GEN);
  const numChunks = contentChunks.length;

  console.log(`Content split into ${numChunks} chunks for question generation.`);

  let totalMcqsGenerated = 0;
  let totalFillBlanksGenerated = 0;
  let totalTrueFalseGenerated = 0;

  for (let i = 0; i < numChunks; i++) {
    const chunkContent = contentChunks[i];
    const isLastChunk = i === numChunks - 1;

    // Distribute remaining questions, ensuring the last chunk tries to fulfill the remainder
    const remainingMcqs = request.mcqCount - totalMcqsGenerated;
    const remainingFillBlanks = request.fillBlankCount - totalFillBlanksGenerated;
    const remainingTrueFalse = request.trueFalseCount - totalTrueFalseGenerated;

    const mcqsForThisChunk = isLastChunk ? remainingMcqs : Math.ceil(remainingMcqs / (numChunks - i));
    const fillBlanksForThisChunk = isLastChunk ? remainingFillBlanks : Math.ceil(remainingFillBlanks / (numChunks - i));
    const trueFalseForThisChunk = isLastChunk ? remainingTrueFalse : Math.ceil(remainingTrueFalse / (numChunks - i));

    const currentProgress = 10 + Math.round((i / numChunks) * 80); // Progress from 10% to 90% during chunk processing

  if (mcqsForThisChunk > 0) {
    onProgress?.({ value: currentProgress, message: `Chunk ${i + 1}/${numChunks}: Generating ${mcqsForThisChunk} MCQs...` });
    const prompt = createQuestionGenerationPrompt(chunkContent, mcqsForThisChunk, 0, 0, difficulty);
    try {
      const responseText = await callGeminiApi(apiKey, prompt);
      const { questions: parsedMcqs, newId } = parseMCQText(responseText, mcqsForThisChunk, overallQuestionId);
      parsedMcqs.forEach(q => allGeneratedQuestions.push(q));
      overallQuestionId = newId;
      totalMcqsGenerated += parsedMcqs.length; // Actual count generated
    } catch (error) {
      console.error(`Failed to generate or parse MCQs for chunk ${i + 1}:`, error);
      for (let j = 0; j < mcqsForThisChunk; j++) {
        allGeneratedQuestions.push({ id: `mcq_err_${overallQuestionId++}`, type: 'mcq', question: `Error generating MCQ (chunk ${i+1})`, options: [], answer: "", explanation: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  if (fillBlanksForThisChunk > 0) {
    onProgress?.({ value: currentProgress + 5, message: `Chunk ${i + 1}/${numChunks}: Generating ${fillBlanksForThisChunk} Fill-blanks...` });
    const prompt = createQuestionGenerationPrompt(chunkContent, 0, fillBlanksForThisChunk, 0, difficulty);
    try {
      const responseText = await callGeminiApi(apiKey, prompt);
      const { questions: parsedFillBlanks, newId } = parseFillBlankText(responseText, fillBlanksForThisChunk, overallQuestionId);
      parsedFillBlanks.forEach(q => allGeneratedQuestions.push(q));
      overallQuestionId = newId;
      totalFillBlanksGenerated += parsedFillBlanks.length;
    } catch (error) {
      console.error(`Failed to generate or parse Fill-blanks for chunk ${i + 1}:`, error);
      for (let j = 0; j < fillBlanksForThisChunk; j++) {
        allGeneratedQuestions.push({ id: `fill_err_${overallQuestionId++}`, type: 'fillblank', question: `Error generating Fill-blank (chunk ${i+1})`, answer: "", explanation: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  if (trueFalseForThisChunk > 0) {
    onProgress?.({ value: currentProgress + 10, message: `Chunk ${i + 1}/${numChunks}: Generating ${trueFalseForThisChunk} T/F...` });
    const prompt = createQuestionGenerationPrompt(chunkContent, 0, 0, trueFalseForThisChunk, difficulty);
    try {
      const responseText = await callGeminiApi(apiKey, prompt);
      const { questions: parsedTrueFalse, newId } = parseTrueFalseText(responseText, trueFalseForThisChunk, overallQuestionId);
      parsedTrueFalse.forEach(q => allGeneratedQuestions.push(q));
      overallQuestionId = newId;
      totalTrueFalseGenerated += parsedTrueFalse.length;
    } catch (error) {
      console.error(`Failed to generate or parse True/False for chunk ${i + 1}:`, error);
      for (let j = 0; j < trueFalseForThisChunk; j++) {
        allGeneratedQuestions.push({ id: `tf_err_${overallQuestionId++}`, type: 'truefalse', question: `Error generating T/F (chunk ${i+1})`, answer: false, explanation: error instanceof Error ? error.message : String(error) });
      }
    }
  }
  }
  
  onProgress?.({ value: 100, message: "Question generation complete." });
  return allGeneratedQuestions;
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
