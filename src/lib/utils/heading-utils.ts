/**
 * Extract likely headings from text using regex patterns.
 * @param text The text to extract headings from.
 * @returns Array of unique headings (max 30).
 */
export const extractHeadings = (text: string): string[] => {
  const headings: string[] = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.length > 0 && trimmedLine.length < 100) {
      // Improved heading patterns
      if (
        (/^[A-Z][A-Za-z\s\d,:;-]{0,80}$/.test(trimmedLine) && !/[.?!]$/.test(trimmedLine)) ||
        /^\d+[.)]\s/.test(trimmedLine) ||
        /^Chapter\s+\d+/i.test(trimmedLine) ||
        /^Section\s+\d+/i.test(trimmedLine)
      ) {
        headings.push(trimmedLine);
      }
    }
  }
  return [...new Set(headings)].slice(0, 30);
};
