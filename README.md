# MockSmart - AI Exam Prep App

## Project Overview

MockSmart is an intelligent exam preparation application designed to help users transform their study materials into interactive learning tools. Key features include:

*   **PDF Upload & Processing**: Upload PDF documents (study notes, textbooks) for analysis. The system extracts text, including OCR for scanned content.
*   **AI-Powered Exam Generation**: Generate mock exams with various question types (Multiple Choice, Fill-in-the-Blank, True/False) based on the uploaded content.
*   **AI Study Assistant**: Chat with an AI tutor to get explanations, summaries, and answers to questions about your study materials.
*   **Customizable Practice**: Configure exam parameters like question count, difficulty, and time limits.

## Technologies Used

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js & npm: [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- A Google Gemini API Key for AI features (see "API Key Setup" below).

### Installation & Local Development

1.  **Clone the repository:**
    ```sh
    git clone <YOUR_GIT_URL> # Replace <YOUR_GIT_URL> with the actual Git URL of this repository
    cd <YOUR_PROJECT_NAME>   # Replace <YOUR_PROJECT_NAME> with the directory name
    ```
2.  **Install dependencies:**
    ```sh
    npm install
    ```
3.  **Set up your Gemini API Key:**
    *   Follow the instructions in the "API Key Setup (Development & Testing)" section below. You'll need to implement a way to provide this key to the application (e.g., via an input field you add, or a temporary modification for local testing).
4.  **Start the development server:**
    ```sh
    npm run dev
    ```
    This will start the Vite development server, typically available at `http://localhost:5173/`.

### Other Ways to Edit

*   **Edit a file directly in GitHub**: You can make quick edits to files directly through the GitHub interface.
*   **Use GitHub Codespaces**: For a cloud-based development environment, you can use GitHub Codespaces if available for this repository.

## AI Integration

This project leverages the Google Gemini API to provide its intelligent features, including:

*   **Question Generation**: The `ExamGenerator` component uses Gemini to create relevant questions from your PDF content.
*   **Chat Assistance**: The `ChatAssistant` component uses Gemini to understand and respond to your queries about the study material.

## API Key Setup (Development & Testing)

To use the AI-powered features of MockSmart locally, you will need a Google Gemini API key.

1.  **Obtain an API Key**: Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/getting-started) or your Google Cloud project.
2.  **Provide the API Key to the Application**:
    *   The application's API utility functions (in `src/lib/geminiApi.ts`) now require the API key to be passed to them.
    *   When running the application locally, you'll need to implement a way to provide this key to the relevant components (`ExamGenerator.tsx`, `ChatAssistant.tsx`). This could be through:
        *   A temporary input field in the UI that you add for development.
        *   Storing the key in a React Context or global state that the components can access (you would need to set this up).
    *   **Important**: Do NOT commit your API key directly into source code files that are pushed to a repository.

Previously, a placeholder for the API key was present in `src/lib/geminiApi.ts`. This has been removed to promote safer practices; the API functions now explicitly require the key as a parameter.

### Note on Production API Key Security

**Direct client-side API calls with an embedded or user-input API key are not recommended for production environments due to security risks.**

For a production deployment, you should implement a **backend proxy server**. The frontend application would make requests to your proxy, and the proxy server would securely attach the API key (stored as an environment variable on the server) before forwarding the request to the Google Gemini API. This keeps your API key confidential.

## Deployment

(This section can be filled in later with generic deployment instructions for Vite React apps, e.g., to Netlify, Vercel, or other static hosting providers, after running `npm run build`.)
