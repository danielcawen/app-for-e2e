import axios from 'axios';
import { AppError } from '../middleware/errorHandler';

/**
 * AIService handles interaction with AI models.
 * It supports both OpenAI-compatible APIs and local Ollama instances.
 */
class AIService {
  private provider: 'openai' | 'ollama' | 'mock';
  private baseUrl: string;
  private model: string;

  constructor() {
    // Determine provider based on environment variables
    const providerEnv = process.env.AI_PROVIDER as any;
    this.provider = providerEnv || 'mock';
    this.baseUrl = process.env.AI_BASE_URL || '';
    this.model = process.env.AI_MODEL || 'gpt-3.5-turbo';
  }

  /**
   * Generates a response from the configured AI provider
   * @param prompt The user message content
   * @param conversationId The ID of the conversation
   * @returns The AI's response text
   */
  async generateResponse(prompt: string, conversationId: number): Promise<string> {
    try {
      switch (this.provider) {
        case 'openai':
          return await this.generateOpenAI(prompt);
        case 'ollama':
          return await this.generateOllama(prompt);
        case 'mock':
        default:
          return await this.getMockResponse(prompt);
      }
    } catch (error: any) {
      console.error(`[AIService] Error generating response: ${error.message}`);
      throw new AppError(
        `AI service error: ${error.message}`,
        500,
        'AI_SERVICE_ERROR'
      );
    }
  }

  /**
   * Generates a response using OpenAI API
   */
  private async generateOpenAI(prompt: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new AppError('OpenAI API key is missing', 500, 'CONFIG_ERROR');
    }

    const baseUrl = this.baseUrl || 'https://api.openai.com/v1'
    const response = await axios.post(
      `${baseUrl}/chat/completions`,
      {
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    return response.data.choices[0].message.content;
  }

  /**
   * Generates a response using a local Ollama instance
   */
  private async generateOllama(prompt: string): Promise<string> {
    if (!this.baseUrl) {
      throw new AppError('Ollama base URL is missing', 500, 'CONFIG_ERROR');
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        { model: this.model, prompt, stream: false },
        { timeout: 30000 }
      );
      const text = response.data.response;
      if (text) return text;
      if (attempt < 3) await new Promise(r => setTimeout(r, 2000));
    }

    throw new AppError('Ollama returned empty response', 500, 'AI_SERVICE_ERROR');
  }

  /**
   * Returns a dummy response for development/testing without an external API
   */
  private async getMockResponse(prompt: string): Promise<string> {
    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes('hello') || lowerPrompt.includes('hi')) {
      return 'Hello! I am your mock AI assistant. How can I help you today?';
    }

    return `This is a mock response to your message: "${prompt.substring(0, 20)}..."`;
  }
}

export default new AIService();
