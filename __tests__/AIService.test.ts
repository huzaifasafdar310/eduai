import { aiService } from '../services/AIService';
import { apiClient } from '../services/apiClient';

// Mock the apiClient to avoid actual network calls during tests
jest.mock('../services/apiClient', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

describe('AIService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup environment variables for testing
    process.env.EXPO_PUBLIC_GROQ_API_KEY_1 = 'key-1';
    process.env.EXPO_PUBLIC_GROQ_API_KEY_2 = 'key-2';
    // Re-initialize service or access keys through existing singleton if possible
    // Note: Since it's a singleton, we might need a way to reset it for testing rotation
    // For this test, we'll focus on behavior assuming keys are loaded
  });

  describe('callGroq Retry & Rotation Logic', () => {
    it('rotates to the next key on 429 error and succeeds on retry', async () => {
      const mock429 = new Error('Rate limit exceeded');
      (mock429 as any).response = { status: 429 };

      const mockSuccess = {
        data: {
          choices: [{ message: { content: 'Success after retry' } }],
        },
      };

      (apiClient.post as jest.Mock)
        .mockRejectedValueOnce(mock429)
        .mockResolvedValueOnce(mockSuccess);

      const result = await aiService.askQuestion('test question');

      expect(apiClient.post).toHaveBeenCalledTimes(2);
      expect(result).toBe('Success after retry');
      
      // Check that different keys were used (sequential rotation)
      const firstCallKey = (apiClient.post as jest.Mock).mock.calls[0][2].headers.Authorization;
      const secondCallKey = (apiClient.post as jest.Mock).mock.calls[1][2].headers.Authorization;
      expect(firstCallKey).not.toBe(secondCallKey);
    });

    it('throws error after exhausting MAX_RETRIES', async () => {
      const mock429 = new Error('Rate limit exceeded');
      (mock429 as any).response = { status: 429 };

      (apiClient.post as jest.Mock).mockRejectedValue(mock429);

      await expect(aiService.askQuestion('test'))
        .rejects.toThrow('All Groq keys exhausted after 3 retries');
      
      expect(apiClient.post).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });
  });

  describe('askQuestion', () => {
    it('prepends context to the user message when provided', async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { choices: [{ message: { content: 'Answer' } }] }
      });

      await aiService.askQuestion('What is this?', 'This is a document about history.');

      expect(apiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Context:\nThis is a document about history.\n\nQuestion: What is this?')
            })
          ])
        }),
        expect.any(Object)
      );
    });
  });

  describe('generateQuiz', () => {
    it('returns valid JSON string from model', async () => {
      const quizJson = JSON.stringify([{ question: 'Q1', options: ['A', 'B', 'C', 'D'], answer: 'A' }]);
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { choices: [{ message: { content: quizJson } }] }
      });

      const result = await aiService.generateQuiz('Math');
      expect(result).toBe(quizJson);
    });

    it('throws if response content is missing', async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({ data: { choices: [] } });

      await expect(aiService.generateQuiz('Math')).rejects.toThrow('Invalid response format');
    });
  });

  describe('extractKeyPoints', () => {
    it('returns parsed string array from valid JSON response', async () => {
      const pointsJson = '["Point 1", "Point 2"]';
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { choices: [{ message: { content: pointsJson } }] }
      });

      const result = await aiService.extractKeyPoints('Long text');
      expect(result).toEqual(['Point 1', 'Point 2']);
    });

    it('falls back to newline split if JSON parsing fails', async () => {
      const pointsText = '- Point A\n- Point B';
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { choices: [{ message: { content: pointsText } }] }
      });

      const result = await aiService.extractKeyPoints('Long text');
      expect(result).toEqual(['Point A', 'Point B']);
    });
  });

  describe('searchAndAnswer', () => {
    it('calls Groq with search-oriented system prompt', async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { choices: [{ message: { content: 'Research results' } }] }
      });

      const result = await aiService.searchAndAnswer('recent discoveries in space');
      
      expect(apiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ content: expect.stringContaining('cite key facts') })
          ])
        }),
        expect.any(Object)
      );
      expect(result).toBe('Research results');
    });
  });
});
