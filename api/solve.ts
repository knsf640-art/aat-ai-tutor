import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { question, fileData, fileMimeType } = req.body || {};
    if (!question && !fileData) {
      return res.status(400).json({ error: 'Question or file is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is missing.' });
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
      model: 'gemini-3.1-pro-preview',
      contents: contents,
    });

    return res.json({ answer: response.text });
  } catch (error: any) {
    console.error('Error generating solution:', error);
    return res.status(500).json({ error: 'Failed to generate solution. Please try again.' });
  }
}
