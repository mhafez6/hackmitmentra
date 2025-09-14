import { AppServer, AppSession, ViewType } from '@mentra/sdk';
import OpenAI from 'openai';

const PACKAGE_NAME = process.env.PACKAGE_NAME ?? (() => { throw new Error('PACKAGE_NAME is not set in .env file'); })();
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY ?? (() => { throw new Error('MENTRAOS_API_KEY is not set in .env file'); })();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? (() => { throw new Error('OPENAI_API_KEY is not set in .env file'); })();
const PORT = parseInt(process.env.PORT || '3000');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

interface TalkingPoints {
  background: string;
  topics: string[];
  questions: string[];
}

class TalkingPointsApp extends AppServer {
  private currentSession: AppSession | null = null;
  private isProcessing = false;

  constructor() {
    super({
      packageName: PACKAGE_NAME,
      apiKey: MENTRAOS_API_KEY,
      port: PORT,
    });
  }

  private async generateTalkingPoints(query: string): Promise<TalkingPoints> {
    try {
      const prompt = `You are a conversation assistant helping someone prepare for social interactions. Based on the query "${query}", generate helpful talking points and conversation starters.

      If the query is about a specific person:
      - Provide relevant background information
      - Suggest conversation topics related to their work, interests, or achievements
      - Include thoughtful questions to ask them

      If the query is about a topic, situation, or general conversation:
      - Provide context and background information
      - Suggest interesting discussion points
      - Include engaging questions to explore the topic

      Format your response as JSON:
      {
        "background": "Relevant context and background information",
        "topics": ["3-5 specific conversation topics"],
        "questions": ["3-5 thoughtful questions to ask"]
      }
      
      Keep responses conversational, specific, and actionable. Focus on creating genuine connection and meaningful dialogue.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that generates conversation talking points. Always respond with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.7,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      return JSON.parse(content);
    } catch (error) {
      console.error('Error generating talking points:', error);
      // Fallback response
      return {
        background: `General conversation about: ${query}`,
        topics: [
          "Ask about their perspective on this topic",
          "Share your own experiences and insights",
          "Explore different angles and viewpoints"
        ],
        questions: [
          "What's your take on this?",
          "How did you get interested in this?",
          "What's been your experience with this?"
        ]
      };
    }
  }

  private displayTalkingPoints(session: AppSession, name: string, points: TalkingPoints): void {
    // Display background
    session.layouts.showTextWall(`Talking with: ${name}\n\n${points.background}`, {
      view: ViewType.MAIN,
      durationMs: 5000
    });

    // Display topics after a delay
    setTimeout(() => {
      const topicsText = `Topics to discuss:\n\n${points.topics.map((topic, i) => `${i + 1}. ${topic}`).join('\n\n')}`;
      session.layouts.showTextWall(topicsText, {
        view: ViewType.MAIN,
        durationMs: 8000
      });
    }, 5500);

    // Display questions after another delay
    setTimeout(() => {
      const questionsText = `Questions to ask:\n\n${points.questions.map((q, i) => `${i + 1}. ${q}`).join('\n\n')}`;
      session.layouts.showTextWall(questionsText, {
        view: ViewType.MAIN,
        durationMs: 8000
      });
    }, 14000);

    // Show completion message
    setTimeout(() => {
      session.layouts.showTextWall("Say another name to get new talking points, or say 'help' for instructions.", {
        view: ViewType.MAIN,
        durationMs: 4000
      });
    }, 22500);
  }

  private showHelp(session: AppSession): void {
    const helpText = `Talking Points App

How to use:
• Say "Chat" followed by any topic or person
• The app will research and provide:
  - Background information
  - Discussion topics  
  - Questions to ask

Examples:
• "Chat John Smith"
• "Chat artificial intelligence"
• "Chat climate change"
• "Chat startup funding"

Say "Chat" + your topic to start!`;

    session.layouts.showTextWall(helpText, {
      view: ViewType.MAIN,
      durationMs: 8000
    });
  }

  private extractQueryFromText(text: string): string | null {
    console.log(`🚨 FUNCTION CALLED WITH: "${text}"`);
    const lowerText = text.toLowerCase().trim();
    console.log(`🔍 Lowercase text: "${lowerText}"`);
    
    // Handle help requests
    if (lowerText.includes('help') || lowerText.includes('instructions')) {
      console.log(`✅ Help detected`);
      return 'help';
    }
    
    // Simple test - just return the text after "chat"
    if (lowerText.includes('chat')) {
      console.log(`✅ FOUND CHAT!`);
      const parts = text.split(/chat[,\s]*/i);
      console.log(`🎯 Split parts:`, parts);
      if (parts.length > 1) {
        const result = parts[1].trim().replace(/[.!?]+$/, '');
        console.log(`🎯 RETURNING: "${result}"`);
        return result;
      }
    }
    
    console.log(`❌ NO MATCH - RETURNING NULL`);
    return null;
  }

  protected async onSession(session: AppSession, sessionId: string, userId: string): Promise<void> {
    this.currentSession = session;
    console.log(`🎯 New session started: ${sessionId} for user: ${userId}`);
    
    // Show welcome message
    session.layouts.showTextWall("Talking Points App Ready!\n\nSay 'Chat' followed by any topic or person.\n\nExample: 'Chat artificial intelligence'\n\nSay 'help' for instructions.", {
      view: ViewType.MAIN,
      durationMs: 6000
    });

    // Add test message after welcome
    setTimeout(() => {
      session.layouts.showTextWall("🔊 Testing voice input...\n\nIf you can see this, the app is working!\n\nTry saying something now.", {
        view: ViewType.MAIN,
        durationMs: 4000
      });
    }, 6000);

    // Handle real-time transcription
    session.events.onTranscription(async (data) => {
      console.log(`🎤 Transcription received:`, {
        text: data.text,
        isFinal: data.isFinal,
        confidence: data.confidence || 'unknown'
      });

      // Show ALL transcription data for debugging
      if (data.text && data.text.trim().length > 0) {
        session.layouts.showTextWall(`🎤 Heard: "${data.text}"\nFinal: ${data.isFinal}\nProcessing: ${this.isProcessing}`, {
          view: ViewType.MAIN,
          durationMs: 2000
        });
      }

      if (data.isFinal && !this.isProcessing) {
        console.log(`✅ Processing final transcription: "${data.text}"`);
        console.log(`🔍 About to call extractQueryFromText with: "${data.text}"`);
        const query = this.extractQueryFromText(data.text);
        console.log(`🔍 extractQueryFromText returned: "${query}"`);
        
        if (query === 'help') {
          this.showHelp(session);
          return;
        }
        
        if (query) {
          this.isProcessing = true;
          console.log(`🚀 Starting research for: ${query}`);
          
          // Show processing message
          session.layouts.showTextWall(`Researching "${query}"...\n\nGenerating talking points...`, {
            view: ViewType.MAIN,
            durationMs: 3000
          });

          try {
            const talkingPoints = await this.generateTalkingPoints(query);
            this.displayTalkingPoints(session, query, talkingPoints);
          } catch (error) {
            console.error('Error processing query:', error);
            session.layouts.showTextWall(`Sorry, I couldn't generate talking points for "${query}". Please try again.`, {
              view: ViewType.MAIN,
              durationMs: 3000
            });
          } finally {
            // Reset processing flag after all displays are done
            setTimeout(() => {
              this.isProcessing = false;
              console.log(`✅ Processing complete, ready for next input`);
            }, 25000);
          }
        }
        // No feedback for unrecognized input - just ignore it
      }
    });

    session.events.onGlassesBattery((data) => {
      console.log('Glasses battery:', data);
    });
  }
}

// Start the server
const app = new TalkingPointsApp();
app.start().catch(console.error);