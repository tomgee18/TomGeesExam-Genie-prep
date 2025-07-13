import { GeminiQuestion } from '../../types';

/**
 * Parses True/False questions from text response
 * @param textBlock The text containing True/False questions
 * @param count Expected number of questions
 * @param overallQuestionId Current ID counter
 * @returns Parsed questions and updated ID
 */
export const parseTrueFalseText = (
  textBlock: string,
  count: number,
  overallQuestionId: number
): { questions: GeminiQuestion[], newId: number } => {
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

  // Add placeholders for failed parses
  while(questions.length < count) {
    questions.push({
      question: "Failed to parse T/F",
      answer: false,
      explanation: "Parsing error or insufficient model output."
    });
  }

  return {
    questions: questions.slice(0, count).map(q => ({
      ...q,
      id: `tf_${overallQuestionId++}`,
      type: 'truefalse'
    })),
    newId: overallQuestionId
  };
};
