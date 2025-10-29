const STABILITY_API_HOST = 'https://api.stability.ai/v1';

interface StabilityAIConfig {
  apiKey: string;
}

interface ImageGenerationParams {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  samples?: number;
}

export class StabilityAIService {
  private static instance: StabilityAIService;
  private config: StabilityAIConfig;

  private constructor() {
    this.config = {
      apiKey: import.meta.env.VITE_STABILITYAI_API_KEY
    };
  }

  static getInstance(): StabilityAIService {
    if (!StabilityAIService.instance) {
      StabilityAIService.instance = new StabilityAIService();
    }
    return StabilityAIService.instance;
  }

  /**
   * Generate a professional course image based on the course name
   * @param courseName The name of the course
   * @returns Base64 encoded image data or null if failed
   */
  async generateCourseImage(courseName: string): Promise<string | null> {
    if (!this.config.apiKey || this.config.apiKey === 'your_stabilityai_api_key') {
      console.warn('StabilityAI API key not configured');
      return null;
    }

    try {
      // Create a professional prompt based on the course name
      const prompt = `Professional educational course cover image for "${courseName}", high quality, clean design, modern typography, educational theme, professional color scheme`;
      
      // Negative prompt to avoid unwanted elements
      const negativePrompt = `blurry, low quality, text, watermark, logo, signature, messy, cluttered, cartoon, anime, 3d render, low resolution, pixelated, distorted`;

      const response = await fetch(`${STABILITY_API_HOST}/generation/stable-diffusion-v1-6/text-to-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          text_prompts: [
            {
              text: prompt,
              weight: 1
            },
            {
              text: negativePrompt,
              weight: -1
            }
          ],
          cfg_scale: 7,
          height: 512,
          width: 512,
          samples: 1,
          steps: 30,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('StabilityAI API Error:', errorData);
        return null;
      }

      const data = await response.json();
      
      if (data.artifacts && data.artifacts.length > 0) {
        // Return the base64 encoded image
        return data.artifacts[0].base64;
      }

      return null;
    } catch (error) {
      console.error('Error generating course image:', error);
      return null;
    }
  }

  /**
   * Check if the API key is configured
   */
  isConfigured(): boolean {
    return !!(this.config.apiKey && this.config.apiKey !== 'your_stabilityai_api_key');
  }
}

export const stabilityAI = StabilityAIService.getInstance();