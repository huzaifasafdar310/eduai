import { apiClient } from './apiClient';

export type SummaryDepth = 'quick' | 'detailed' | 'expert';

export type QuizQuestion = {
  question: string;
  options: [string, string, string, string];
  answer: string;
};

/**
 * 🤖 AIService: Production-Grade AI Orchestrator
 * Communicates with the secure backend proxy.
 * Ensures strict error handling for testing and UI feedback.
 */
class AIService {
  /**
   * Internal wrapper for backend AI calls
   */
  private async callBackend(
    endpoint: string,
    payload: any
  ): Promise<{ content: string; remainingCredits: number }> {
    try {
      const response = await apiClient.post(endpoint, payload);
      
      const content = response.data?.choices?.[0]?.message?.content;
      const remainingCredits = response.data?.remainingCredits;

      if (!content) {
        throw new Error('Invalid response format from AI proxy.');
      }

      return { content, remainingCredits };
    } catch (error: any) {
      // Re-throw errors from the interceptor (which includes backend error messages)
      // This ensures "All Groq keys exhausted" propagates correctly to tests and UI.
      throw error;
    }
  }

  /**
   * Summarizes text
   */
  public async summarizeDocument(text: string, depth: SummaryDepth): Promise<string> {
    let systemPrompt = 'Summarize the following text. Make it comprehensive.';
    if (depth === 'quick') systemPrompt = 'Provide a brief, 3-sentence summary of the main points.';
    if (depth === 'detailed') systemPrompt = 'Provide a structured, detailed summary with bullet points.';

    const { content } = await this.callBackend('/api/ai/chat', {
       model: 'mixtral-8x7b-32768',
       messages: [
         { role: 'system', content: systemPrompt },
         { role: 'user', content: text }
       ],
       temperature: 0.3
    });
    return content;
  }

  /**
   * General purpose academic assistant
   */
  public async askQuestion(question: string, context?: string): Promise<string> {
    const systemPrompt = 'You are a helpful educational assistant. Answer clearly and concisely.';
    const userContent = context ? `Context:\n${context}\n\nQuestion: ${question}` : question;

    const { content } = await this.callBackend('/api/ai/chat', {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      temperature: 0.7
    });
    return content;
  }

  /**
   * Generates quizzes
   */
  public async generateQuiz(topic: string, numQuestions: number = 5): Promise<string> {
    const systemPrompt = 'Generate a quiz in valid JSON format. Return ONLY a JSON array.';
    const userMessage = `Generate ${numQuestions} multiple choice questions about: ${topic}`;

    const { content } = await this.callBackend('/api/ai/chat', {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.5
    });
    return content;
  }

  /**
   * Extract Key Points
   */
  public async extractKeyPoints(text: string): Promise<string[]> {
    const systemPrompt = 'Extract key points as a valid JSON array of strings.';

    try {
      const { content } = await this.callBackend('/api/ai/chat', {
        model: 'mixtral-8x7b-32768',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.3
      });

      const cleaned = content.replace(/```json|```/g, '').trim();
      try {
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        return content.split('\n').filter(l => l.trim().length > 0);
      }
      return [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Educational search
   */
  public async searchAndAnswer(query: string): Promise<string> {
    const systemPrompt = 'Answer using your research knowledge. Be thorough and cite key facts.';

    const { content } = await this.callBackend('/api/ai/chat', {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      temperature: 0.6
    });
    return content;
  }
}

export const aiService = new AIService();
