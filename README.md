# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/752d6a85-7500-4013-81f3-94c901f32c8d

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/752d6a85-7500-4013-81f3-94c901f32c8d) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Project Overview

MockSmart is an intelligent exam preparation application designed to help users transform their study materials into interactive learning tools. Key features include:

*   **PDF Upload & Processing**: Upload PDF documents (study notes, textbooks) for analysis. The system extracts text, including OCR for scanned content.
*   **AI-Powered Exam Generation**: Generate mock exams with various question types (Multiple Choice, Fill-in-the-Blank, True/False) based on the uploaded content.
*   **AI Study Assistant**: Chat with an AI tutor to get explanations, summaries, and answers to questions about your study materials.
*   **Customizable Practice**: Configure exam parameters like question count, difficulty, and time limits.

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
        *   A temporary input field in the UI.
        *   Storing the key in a React Context or global state that the components can access.
    *   **Important**: Do NOT commit your API key directly into source code files that are pushed to a repository.

Previously, a placeholder for the API key was present in `src/lib/geminiApi.ts`. This has been removed to promote safer practices; the API functions now explicitly require the key as a parameter.

### Note on Production API Key Security

**Direct client-side API calls with an embedded or user-input API key are not recommended for production environments due to security risks.**

For a production deployment, you should implement a **backend proxy server**. The frontend application would make requests to your proxy, and the proxy server would securely attach the API key (stored as an environment variable on the server) before forwarding the request to the Google Gemini API. This keeps your API key confidential.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/752d6a85-7500-4013-81f3-94c901f32c8d) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
