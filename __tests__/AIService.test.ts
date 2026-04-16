import { aiService } from '../services/AIService';
import { apiClient } from '../services/apiClient';

// Mock the apiClient to avoid actual network calls during tests
jest.mock('../services/apiClient', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

describe('AIService Unit Tests (Proxy-Aware)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('callGroq Proxy Behavior', () => {
    it('successfully returns content on a single proxy call', async () => {
      const mockSuccess = {
        data: {
          choices: [{ message: { content: 'Success from proxy' } }],
          remainingCredits: 9
        },
      };

      (apiClient.post as jest.Mock).mockResolvedValueOnce(mockSuccess);

      const result = await aiService.askQuestion('test question');

      expect(apiClient.post).toHaveBeenCalledTimes(1);
      expect(result).toBe('Success from proxy');
    });

    it('throws the specific "exhausted" error message when backend fails all retries', async () => {
      // The backend returns a 503 with this specific error message after 3 retries
      const exhaustedError = new Error('All Groq keys exhausted after 3 retries');
      (exhaustedError as any).response = { 
        status: 503, 
        data: { error: 'All Groq keys exhausted after 3 retries' } 
      };

      (apiClient.post as jest.Mock).mockRejectedValueOnce(exhaustedError);

      await expect(aiService.askQuestion('test'))
        .rejects.toThrow('All Groq keys exhausted after 3 retries');
      
      // Since the proxy handles retries internally, the client only makes 1 request
      expect(apiClient.post).toHaveBeenCalledTimes(1);
    });

    it('throws "Insufficient credits" when backend returns 402', async () => {
      const creditError = new Error('Insufficient credits');
      (creditError as any).response = { 
        status: 402, 
        data: { error: 'Insufficient credits or profile not found' } 
      };

      (apiClient.post as jest.Mock).mockRejectedValueOnce(creditError);

      await expect(aiService.askQuestion('test'))
        .rejects.toThrow('Insufficient credits');
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
        })
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
  });
});
