import { GeminiQuestion } from '../../types';

/**
 * Parses MCQ questions from text response
 * @param textBlock The text containing MCQs
 * @param count Expected number of questions
 * @param overallQuestionId Current ID counter
 * @returns Parsed questions and updated ID
 */
export const parseMCQText = (
  textBlock: string,
  count: number,
  overallQuestionId: number
): { questions: GeminiQuestion[], newId: number } => {
  const questions: Omit<GeminiQuestion, 'id' | 'type'>[] = [];
  const questionRegex = /(\d+)\.\s(.*?)\nA\)\s(.*?)\nB\)\s(.*?)\nC\)\s(.*?)\nD\)\s(.*?)\nAnswer:\s([A-D])\)\s(.*?)\nExplanation:\s(.*?)(?=\n\d+\.|\n\n|$)/gs;
  let match;
  let parsedCount = 0;

  while ((match = questionRegex.exec(textBlock)) !== null && parsedCount < count) {
    questions.push({
      question: match[2].trim(),
      options: [match[3].trim(), match[4].trim(), match[5].trim(), match[6].trim()],
      answer: `${match[7]}) ${match[8].trim()}`,
      explanation: match[9].trim(),
    });
    parsedCount++;
  }

  // Add placeholders for failed parses
  while(questions.length < count) {
    questions.push({
      question: "Failed to parse MCQ",
      options: ["","","",""],
      answer: "",
      explanation: "Parsing error or insufficient model output."
    });
  }

  return {
    questions: questions.slice(0, count).map(q => ({
      ...q,
      id: `mcq_${overallQuestionId++}`,
      type: 'mcq'
    })),
    newId: overallQuestionId
  };
};
