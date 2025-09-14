# Talking Points App for Smart Glasses

A MentraOS app that helps you have better conversations by providing AI-generated talking points about people you meet. Simply say a person's name, and the app will research them and display conversation topics and questions on your smart glasses.

## Features

- **Voice Input**: Say any person's name to get talking points
- **AI Research**: Uses OpenAI to generate relevant conversation topics
- **Smart Display**: Shows background info, discussion topics, and thoughtful questions
- **Display Only**: No camera required - works with display-only smart glasses
- **Fallback Support**: Provides general conversation starters for unknown names

## How It Works

1. Say a person's name (e.g., "John Smith", "Tell me about Sarah")
2. The app researches the name using AI
3. Displays talking points in sequence:
   - Background information
   - Discussion topics
   - Questions to ask
4. Say another name for new talking points

## Setup Instructions

### Prerequisites

- Node.js (v18 or later)
- Bun runtime
- MentraOS Developer Account
- OpenAI API Key
- Compatible smart glasses

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <your-repo-url>
   cd MentraOS-Display-Example-App
   bun install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your credentials:
   ```
   PORT=3000
   PACKAGE_NAME=com.yourname.talkingpoints
   MENTRAOS_API_KEY=your_mentraos_api_key
   OPENAI_API_KEY=your_openai_api_key
   ```

3. **Register your app:**
   - Go to [console.mentra.glass](https://console.mentra.glass/)
   - Create a new app with your package name
   - Add microphone permission
   - Set your ngrok URL as the public URL

4. **Set up ngrok:**
   ```bash
   ngrok config add-authtoken <your_authtoken>
   ngrok http --url=<YOUR_STATIC_DOMAIN> 3000
   ```

5. **Run the app:**
   ```bash
   bun run dev
   ```

### Usage

- Say "help" for instructions
- Say any person's name to get talking points
- Examples: "John Smith", "Sarah Johnson", "Tell me about Mike"

## API Keys Required

- **MentraOS API Key**: Get from [MentraOS Developer Console](https://console.mentra.glass/)
- **OpenAI API Key**: Get from [OpenAI Platform](https://platform.openai.com/api-keys)

## App Flow

1. **Welcome**: Shows instructions when app starts
2. **Voice Recognition**: Listens for names via transcription
3. **Processing**: Shows "Researching..." message
4. **Display Sequence**:
   - Background info (5 seconds)
   - Discussion topics (8 seconds)
   - Questions to ask (8 seconds)
   - Ready for next name (4 seconds)

## Error Handling

- Provides fallback talking points if AI fails
- Validates name input format
- Shows helpful feedback for unrecognized input
- Prevents multiple simultaneous requests

## Development

Built with:
- MentraOS SDK
- OpenAI API
- TypeScript
- Express.js
- WebSocket support

## License

MIT License

### Install MentraOS on your phone

MentraOS install links: [mentra.glass/install](https://mentra.glass/install)

### (Easiest way to get started) Set up ngrok

1. `brew install ngrok`

2. Make an ngrok account

3. [Use ngrok to make a static address/URL](https://dashboard.ngrok.com/)

### Register your App with MentraOS

1. Navigate to [console.mentra.glass](https://console.mentra.glass/)

2. Click "Sign In", and log in with the same account you're using for MentraOS

3. Click "Create App"

4. Set a unique package name like `com.yourName.yourAppName`

5. For "Public URL", enter your Ngrok's static URL

6. In the edit app screen, add the microphone permission

### Get your App running!

1. [Install bun](https://bun.sh/docs/installation)

2. Create a new repo from this template using the `Use this template` dropdown in the upper right or the following command: `gh repo create --template Mentra-Community/MentraOS-Cloud-Example-App`

    ![Create repo from template](https://github.com/user-attachments/assets/c10e14e8-2dc5-4dfa-adac-dd334c1b73a5)

3. Clone your new repo locally: `git clone <your-repo-url>`

4. cd into your repo, then type `bun install`

5. Set up your environment variables:
   * Create a `.env` file in the root directory by copying the example: `cp .env.example .env`
   * Edit the `.env` file with your app details:
     ```
     PORT=3000
     PACKAGE_NAME=com.yourName.yourAppName
     MENTRAOS_API_KEY=your_api_key_from_console
     ```
   * Make sure the `PACKAGE_NAME` matches what you registered in the MentraOS Console
   * Get your `API_KEY` from the MentraOS Developer Console

6. Run your app with `bun run dev`

7. To expose your app to the internet (and thus MentraOS) with ngrok, run: `ngrok http --url=<YOUR_NGROK_URL_HERE> 3000`
    * `3000` is the port. It must match what is in the app config. For example, if you entered `port: 8080`, use `8080` for ngrok instead.


### Next Steps

Check out the full documentation at [docs.mentra.glass](https://docs.mentra.glass/core-concepts)

#### Subscribing to events

You can listen for transcriptions, translations, and other events within the onSession function.
