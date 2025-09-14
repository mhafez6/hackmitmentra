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

  private async generateTalkingPoints(name: string): Promise<TalkingPoints> {
    try {
      const prompt = `Generate talking points for a conversation with someone named "${name}". 
      
      Please provide:
      1. A brief background summary (if this is a known public figure, or general conversation starters if not)
      2. 3-5 interesting conversation topics
      3. 3-5 thoughtful questions to ask
      
      Format your response as JSON with the following structure:
      {
        "background": "Brief background or general info",
        "topics": ["topic1", "topic2", "topic3"],
        "questions": ["question1", "question2", "question3"]
      }
      
      Keep responses concise and conversational. If the name is not a recognizable public figure, focus on general conversation starters and getting-to-know-you topics.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
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
        max_tokens: 500,
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
        background: `General conversation with ${name}`,
        topics: [
          "Ask about their interests and hobbies",
          "Discuss current events or shared experiences",
          "Talk about work or professional background"
        ],
        questions: [
          "What brings you here today?",
          "What are you passionate about?",
          "What's been keeping you busy lately?"
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
• Say a person's name to get conversation topics
• The app will research and provide:
  - Background information
  - Discussion topics  
  - Questions to ask

Examples:
• "John Smith"
• "Sarah Johnson"
• "Tell me about Mike"

Say any name to start!`;

    session.layouts.showTextWall(helpText, {
      view: ViewType.MAIN,
      durationMs: 8000
    });
  }

  private extractNameFromText(text: string): string | null {
    const lowerText = text.toLowerCase().trim();
    
    // Handle help requests
    if (lowerText.includes('help') || lowerText.includes('instructions')) {
      return 'help';
    }

    // Remove common prefixes
    const prefixes = ['tell me about', 'research', 'look up', 'find info on', 'who is'];
    let cleanText = lowerText;
    
    for (const prefix of prefixes) {
      if (cleanText.startsWith(prefix)) {
        cleanText = cleanText.substring(prefix.length).trim();
        break;
      }
    }

    // Basic name validation - should have at least 2 characters and look like a name
    if (cleanText.length >= 2 && /^[a-zA-Z\s'-]+$/.test(cleanText)) {
      // Capitalize first letter of each word
      return cleanText.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    return null;
  }

  protected async onSession(session: AppSession, sessionId: string, userId: string): Promise<void> {
    this.currentSession = session;
    
    // Show welcome message
    session.layouts.showTextWall("Talking Points App Ready!\n\nSay a person's name to get conversation topics.\n\nSay 'help' for instructions.", {
      view: ViewType.MAIN,
      durationMs: 5000
    });

    // Handle real-time transcription
    session.events.onTranscription(async (data) => {
      if (data.isFinal && !this.isProcessing) {
        const name = this.extractNameFromText(data.text);
        
        if (name === 'help') {
          this.showHelp(session);
          return;
        }
        
        if (name) {
          this.isProcessing = true;
          
          // Show processing message
          session.layouts.showTextWall(`Researching ${name}...\n\nGenerating talking points...`, {
            view: ViewType.MAIN,
            durationMs: 3000
          });

          try {
            const talkingPoints = await this.generateTalkingPoints(name);
            this.displayTalkingPoints(session, name, talkingPoints);
          } catch (error) {
            console.error('Error processing name:', error);
            session.layouts.showTextWall(`Sorry, I couldn't generate talking points for ${name}. Please try again.`, {
              view: ViewType.MAIN,
              durationMs: 3000
            });
          } finally {
            // Reset processing flag after all displays are done
            setTimeout(() => {
              this.isProcessing = false;
            }, 25000);
          }
        } else {
          // Show feedback for unrecognized input
          session.layouts.showTextWall(`I didn't recognize "${data.text}" as a name.\n\nPlease say a person's name or 'help' for instructions.`, {
            view: ViewType.MAIN,
            durationMs: 3000
          });
        }
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