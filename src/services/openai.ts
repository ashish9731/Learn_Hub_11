import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export interface UserProfile {
  name: string;
  companyName: string;
  designation: string;
  profileDescription: string;
  learningGoals: string;
  interestedTech?: string[];
}

export interface ChatSession {
  userId: string;
  profile: UserProfile;
  wordCount: number;
  lastResetDate: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
}

const MAX_WORDS_PER_DAY = 200;

export class KaayaAI {
  private static instance: KaayaAI;
  private sessions: Map<string, ChatSession> = new Map();

  static getInstance(): KaayaAI {
    if (!KaayaAI.instance) {
      KaayaAI.instance = new KaayaAI();
    }
    return KaayaAI.instance;
  }

  private getSystemPrompt(profile: UserProfile): string {
    return `You are Kaaya, a personalized learning assistant. You help users create learning paths based on their profile.

User Profile:
- Name: ${profile.name}
- Company: ${profile.companyName}
- Designation: ${profile.designation}
- Profile: ${profile.profileDescription}
- Learning Goals: ${profile.learningGoals}
- Interested Technologies: ${profile.interestedTech ? profile.interestedTech.join(', ') : profile.learningGoals}

Guidelines:
1. ONLY discuss personalized learning paths related to their profile and interests
2. Focus on their learning goals: ${profile.learningGoals}
3. Suggest learning resources, courses, and skill development paths
4. Keep responses concise and actionable
5. Always relate suggestions to their role as ${profile.designation}
6. If asked about unrelated topics, politely redirect to learning paths
7. Be encouraging and supportive
8. Provide specific, practical learning recommendations

Remember: You are strictly focused on personalized learning path guidance based on the user's profile.`;
  }

  async initializeSession(userId: string, profile: UserProfile): Promise<void> {
    const today = new Date().toDateString();
    const existingSession = this.sessions.get(userId);

    if (existingSession && existingSession.lastResetDate !== today) {
      // Reset word count for new day
      existingSession.wordCount = 0;
      existingSession.lastResetDate = today;
    } else if (!existingSession) {
      // Create new session
      this.sessions.set(userId, {
        userId,
        profile,
        wordCount: 0,
        lastResetDate: today,
        messages: []
      });
    } else {
      // Update profile if changed
      existingSession.profile = profile;
    }
  }

  async sendMessage(userId: string, message: string): Promise<string> {
    const session = this.sessions.get(userId);
    if (!session) {
      throw new Error('Session not initialized. Please complete the profile form first.');
    }

    // Check daily word limit
    if (session.wordCount >= MAX_WORDS_PER_DAY) {
      return `Hi ${session.profile.name}! You've reached your daily limit of ${MAX_WORDS_PER_DAY} words with Kaaya. Please come back tomorrow for more personalized learning guidance! 🌟`;
    }

    try {
      // Add user message to session
      session.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date()
      });

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: this.getSystemPrompt(session.profile) },
          ...session.messages.slice(-10).map(msg => ({ // Keep last 10 messages for context
            role: msg.role,
            content: msg.content
          }))
        ],
        max_tokens: 150,
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content || 
        "I'm sorry, I couldn't generate a response. Please try again.";

      // Count words in response
      const wordCount = response.split(/\s+/).length;
      session.wordCount += wordCount;

      // Add assistant message to session
      session.messages.push({
        role: 'assistant',
        content: response,
        timestamp: new Date()
      });

      return response;
    } catch (error) {
      console.error('OpenAI API Error:', error);
      return `Hi ${session.profile.name}! I'm having trouble connecting right now. Please check your API key configuration and try again.`;
    }
  }

  getRemainingWords(userId: string): number {
    const session = this.sessions.get(userId);
    if (!session) return MAX_WORDS_PER_DAY;
    return Math.max(0, MAX_WORDS_PER_DAY - session.wordCount);
  }

  getSession(userId: string): ChatSession | undefined {
    return this.sessions.get(userId);
  }
}

export const kaayaAI = KaayaAI.getInstance();