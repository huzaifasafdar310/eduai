import { apiClient } from './apiClient';

export type SummaryDepth = 'quick' | 'detailed' | 'expert';

export type QuizQuestion = {
  question: string;
  options: [string, string, string, string];
  answer: string;
};

/**
 * Service specifically for Language Models (Groq).
 * Handles multi-key rotation, retries, and high-level educational task abstractions.
 */
class AIService {
  /**
   * Core proxy call wrapper
   */
  private async callGroq(
    messages: any[],
    model: string,
    temperature: number
  ): Promise<string> {
    try {
      const response = await apiClient.post('/api/ai/chat', {
        model,
        messages,
        temperature,
      });

      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Invalid response format from AI proxy.');
      }
      return content;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Summarizes text based on a specific depth
   */
  public async summarizeDocument(text: string, depth: SummaryDepth): Promise<string> {
    let systemPrompt = 'Summarize the following text. Make it comprehensive.';
    if (depth === 'quick') systemPrompt = 'Provide a brief, 3-sentence summary of the main points.';
    if (depth === 'detailed') systemPrompt = 'Provide a structured, detailed summary with bullet points summarizing the core information.';

    return this.callGroq(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      'mixtral-8x7b-32768',
      0.3
    );
  }

  /**
   * General purpose academic assistant question answering
   */
  public async askQuestion(question: string, context?: string): Promise<string> {
    const systemPrompt = 'You are a helpful educational assistant. Answer clearly and concisely.';
    const userContent = context ? `Context:\n${context}\n\nQuestion: ${question}` : question;

    return this.callGroq(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      'llama-3.3-70b-versatile',
      0.7
    );
  }

  /**
   * Generates a quiz in a structured JSON format
   */
  public async generateQuiz(topic: string, numQuestions: number = 5): Promise<string> {
    const systemPrompt = 'You are an elite quiz generator. Return ONLY a valid JSON array of objects. Do not include markdown formatting, preambles, or explanations. Each object must follow this schema: { "question": "string", "options": ["string", "string", "string", "string"], "answer": "The exact string of the correct option" }';
    const userMessage = `Generate ${numQuestions} multiple choice questions about: ${topic}`;

    return this.callGroq(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      'llama-3.3-70b-versatile',
      0.5
    );
  }

  /**
   * Educational search surrogate using Groq's training knowledge
   * @remarks This uses Groq's training knowledge instead of live web search. For real-time data, a search API integration would be needed.
   */
  public async searchAndAnswer(query: string): Promise<string> {
    const systemPrompt = 'You are a knowledgeable educational assistant. Answer the question using your training knowledge. Be thorough and cite key facts.';

    return this.callGroq(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      'llama-3.3-70b-versatile',
      0.6
    );
  }

  /**
   * Extracts key structured points from a document
   */
  public async extractKeyPoints(text: string): Promise<string[]> {
    const systemPrompt = 'Extract the most important key points from the following text. Return ONLY a valid JSON array of strings. No markdown, no numbering, no explanations.';

    try {
      const response = await this.callGroq(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        'mixtral-8x7b-32768',
        0.3
      );

      // Attempt to parse JSON
      const cleanedResponse = response.replace(/```json|```/g, '').trim();
      try {
        const parsed = JSON.parse(cleanedResponse);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // Fallback to newline split if JSON parsing fails
        return response.split('\n').map(line => line.replace(/^[-*•]\s+/, '').trim()).filter(line => line.length > 0);
      }
      return [];
    } catch (error) {
      throw error;
    }
  }
}

export const aiService = new AIService();
