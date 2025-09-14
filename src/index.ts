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
  private lastTalkingPoints: string = "";
  private autoScrollInterval: NodeJS.Timeout | null = null;

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
    // Create comprehensive talking points text and store it
    this.lastTalkingPoints = `Talking with: ${name}

BACKGROUND:
${points.background}

TOPICS TO DISCUSS:
${points.topics.map((topic, i) => `${i + 1}. ${topic}`).join('\n')}

QUESTIONS TO ASK:
${points.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Say 'Chat [topic]' for new talking points`;

    // Start auto-scroll display
    this.startAutoScroll(session);
  }

  private startAutoScroll(session: AppSession): void {
    // Clear any existing auto-scroll
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
    }

    if (!this.lastTalkingPoints) return;
    
    const lines = this.lastTalkingPoints.split('\n');
    const screenLines = 8; // Lines that fit comfortably on screen
    const totalSections = Math.ceil(lines.length / screenLines);
    
    if (totalSections <= 1) {
      // Content fits on one screen, no need to scroll
      session.layouts.showTextWall(this.lastTalkingPoints, {
        view: ViewType.MAIN,
        durationMs: 0
      });
      return;
    }

    let currentSection = 0;
    
    // Display first section immediately
    this.displaySection(session, lines, currentSection, screenLines, totalSections);
    
    // Auto-scroll every 8 seconds
    this.autoScrollInterval = setInterval(() => {
      currentSection = (currentSection + 1) % totalSections;
      this.displaySection(session, lines, currentSection, screenLines, totalSections);
      console.log(`📜 Auto-scrolled to section ${currentSection + 1}/${totalSections}`);
    }, 8000);
  }

  private displaySection(session: AppSession, lines: string[], section: number, screenLines: number, totalSections: number): void {
    const startLine = section * screenLines;
    const endLine = Math.min(startLine + screenLines, lines.length);
    const visibleContent = lines.slice(startLine, endLine).join('\n');
    
    const scrollIndicator = totalSections > 1 ? 
      `\n\n[Page ${section + 1}/${totalSections}] Auto-scrolling...` : '';
    
    session.layouts.showTextWall(visibleContent + scrollIndicator, {
      view: ViewType.MAIN,
      durationMs: 0
    });
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
    
    // Extract text after "chat" - handle "chat, who is" format
    if (lowerText.includes('chat')) {
      console.log(`✅ FOUND CHAT!`);
      const parts = text.split(/chat[,\s]*/i);
      console.log(`🎯 Split parts:`, parts);
      if (parts.length > 1) {
        let result = parts[1].trim().replace(/[.!?]+$/, '');
        
        // Handle "who is X" format - extract just the name/topic
        if (result.toLowerCase().startsWith('who is ')) {
          result = result.substring(7); // Remove "who is "
        }
        
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

      // Don't show any transcriptions on screen to avoid overwriting talking points
      // All transcription feedback is in console logs only

      if (data.isFinal) {
        console.log(`✅ Processing final transcription: "${data.text}"`);
        console.log(`🔍 About to call extractQueryFromText with: "${data.text}"`);
        const query = this.extractQueryFromText(data.text);
        console.log(`🔍 extractQueryFromText returned: "${query}"`);
        
        if (query === 'help') {
          this.showHelp(session);
          return;
        }
        
        if (query) {
          // Always process new chat commands, even if already processing
          console.log(`🚀 Starting research for: ${query}`);
          
          // Show processing message
          session.layouts.showTextWall(`Researching "${query}"...\n\nGenerating talking points...`, {
            view: ViewType.MAIN,
            durationMs: 3000
          });

          // Set processing flag after showing message to allow new commands
          this.isProcessing = true;

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
            this.isProcessing = false;
          }
        }
        // No feedback for unrecognized input - just ignore it
      }
    });

    // Auto-scroll cleanup will happen when new content is generated

    session.events.onGlassesBattery((data) => {
      console.log('Glasses battery:', data);
    });
  }
}

// Start the server
const app = new TalkingPointsApp();
app.start().catch(console.error);