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
  private readonly GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
  private readonly MAX_RETRIES = 3;
  
  private apiKeys: string[] = [];
  private currentKeyIndex: number = 0;

  constructor() {
    // Collect individual keys
    const individualKeys = [
      process.env.EXPO_PUBLIC_GROQ_API_KEY_1 || '',
      process.env.EXPO_PUBLIC_GROQ_API_KEY_2 || '',
      process.env.EXPO_PUBLIC_GROQ_API_KEY_3 || '',
    ];

    // Collect bulk keys from comma-separated env
    const bulkKeys = (process.env.EXPO_PUBLIC_GROQ_API_KEYS || '').split(',').map(k => k.trim());

    // Merge, filter empty, and deduplicate
    this.apiKeys = Array.from(new Set([...individualKeys, ...bulkKeys])).filter(key => key !== '');
  }

  /**
   * Sequential round-robin key selection
   */
  private getNextKey(): string {
    if (this.apiKeys.length === 0) {
      throw new Error('API Configuration Error: No Groq API keys present in environment variables.');
    }
    const key = this.apiKeys[this.currentKeyIndex];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    return key;
  }

  /**
   * Core Groq API call wrapper with rotation and retry logic
   */
  private async callGroq(
    messages: any[], 
    model: string, 
    temperature: number, 
    retries: number = 0
  ): Promise<string> {
    const key = this.getNextKey();

    try {
      const response = await apiClient.post(
        this.GROQ_API_URL,
        {
          model,
          messages,
          temperature,
        },
        {
          headers: { Authorization: `Bearer ${key}` },
        }
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Invalid response format from Groq provider.');
      }
      return content;
    } catch (error: any) {
      // Rotation & Retry Logic for Rate Limits (429) or Network Errors
      const isRateLimit = error.response?.status === 429 || error.message?.includes('429');
      const isNetworkError = !error.response || error.code === 'ECONNABORTED';

      if ((isRateLimit || isNetworkError) && retries < this.MAX_RETRIES) {
        const nextRetry = retries + 1;
        const waitTime = 500 * nextRetry;
        
        console.warn(`Groq Error (Attempt ${nextRetry}/${this.MAX_RETRIES}): ${error.message}. Rotating key and retrying in ${waitTime}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.callGroq(messages, model, temperature, nextRetry);
      }

      if (retries >= this.MAX_RETRIES) {
        throw new Error(`All Groq keys exhausted after ${this.MAX_RETRIES} retries. Last error: ${error.message}`);
      }

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
