import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Route for Gemini Integration
  app.post('/api/solve', async (req, res) => {
    try {
      const { question, fileData, fileMimeType } = req.body;
      if (!question && !fileData) {
        return res.status(400).json({ error: 'Question or file is required' });
      }

      // Ensure API key is present
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is missing.');
      }

      const ai = new GoogleGenAI({ apiKey });
      const textPrompt = `You are a highly experienced and helpful Accounting Tutor for AAT (Association of Accounting Technicians) Sri Lanka.
      A student has submitted the following exam question/problem to solve:
      
      ${question ? `"${question}"` : 'Please refer to the attached file.'}
      
      Your goal is to explain this step-by-step so the student can easily understand and learn. 
      - Break down the steps clearly.
      - Use a mix of Sinhala and English terms (e.g., Sinhala language with English accounting terminology, or Singlish if it reads more naturally, but prioritize clear, professional Sinhala and English mixed).
      - Present the final answer clearly.
      - Format your response using Markdown for easy readability (use bolding, bullet points, and tables if necessary).`;

      const contents: any[] = [textPrompt];
      if (fileData && fileMimeType) {
        contents.push({
          inlineData: {
            data: fileData,
            mimeType: fileMimeType,
          },
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-pro',
        contents: contents,
      });

      res.json({ answer: response.text });
    } catch (error: any) {
      console.error('Error generating solution:', error);
      res.status(500).json({ error: error.message || 'Failed to generate solution. Please try again.' });
    }
  });

  // API Route for Follow-up Chat
  app.post('/api/chat', async (req, res) => {
    try {
      const { originalQuestion, solution, chatHistory, message } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is missing.');
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const systemPrompt = `You are a helpful AAT Sri Lanka Accounting Tutor. 
      The user previously asked this problem: "${originalQuestion || 'See attached file in previous step.'}"
      You provided this solution: "${solution}"
      Now the user is asking a follow-up question. Answer concisely and clearly in a mix of Sinhala and English. Provide step-by-step guidance if needed.`;

      const contents: any[] = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: "Understood. I am ready to answer the follow-up question." }] }
      ];

      if (Array.isArray(chatHistory)) {
         chatHistory.forEach(msg => {
            contents.push({
               role: msg.role === 'user' ? 'user' : 'model',
               parts: [{ text: msg.text }]
            });
         });
      }

      contents.push({ role: 'user', parts: [{ text: message }] });

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-pro',
        contents: contents,
      });

      res.json({ answer: response.text });
    } catch (error: any) {
      console.error('Error generating chat response:', error);
      res.status(500).json({ error: error.message || 'Failed to generate response. Please try again.' });
    }
  });

  // Vite middleware for development or serving static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
