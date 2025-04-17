# Gemini Retro Terminal

A sleek, retro-inspired terminal interface for interacting with the Google Gemini AI model. Designed with a nostalgic nod to classic 90s computing, this project combines old-school aesthetics with next-gen intelligence.

## Live Demo

Explore the live experience: [Gemini Retro Terminal](https://gemini-app-lake.vercel.app/)

> ⚠️ This is an active project. Community contributions are welcome and encouraged!


## Features

- 🖥️ CRT-style terminal design with classic color themes
- ⌨️ Typewriter-style animated text for authentic terminal feel
- 📝 Markdown rendering for well-formatted Gemini responses
- 📎 File upload support for Gemini Vision features
- 💾 Save and reload chat history
- 🔐 Secure Gemini API key handling using serverless functions
- 📱 Fully responsive design for mobile and desktop
- ⚙️ Customizable system prompts to define Gemini's personality

## Getting Started

### Prerequisites

- A Google Gemini API key (available from [Google AI Studio](https://makersuite.google.com/app/apikey))
- Node.js and npm installed locally
- A Vercel account for cloud deployment

### Local Development

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd gemini-app
   ```

2. Install dependencies for local development server:
   ```bash
   npm install express dotenv cors
   ```

3. Create a `.env` file in the project root and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. Start the local development server:
   ```bash
   node local-server.js
   ```

5. Access the app at `http://localhost:3000`



## Configuration

You can fine-tune the app’s behavior and design by editing the following files:

- `js/config.js` – Set the Gemini model, system prompt, and other options
- `css/styles.css` – Customize the retro terminal appearance
- `index.html` – Modify the interface or add additional UI elements


## Security Notes

This application uses a serverless function (`/api/getKey.js`) to protect your Gemini API key.

Key protections include:

- Validates the request origin to prevent unauthorized access
- Restricts API key delivery to whitelisted domains
- Never exposes the key directly in client-side code
- Tracks request logs for monitoring and debugging


## API Configuration

The serverless function `/api/getKey.js` handles secure API key distribution. When deployed:

1. Verifies request origin (e.g., from your Vercel app domain)
2. Responds only to valid, authorized requests
3. Logs usage activity for audit purposes



## Customizing the Bot Persona

Modify the bot’s personality by changing the `SYSTEM_PROMPT` inside `js/config.js`.

The default is a retro-futuristic assistant, but you can tailor it to be anything your heart desires.


## License

This project is licensed under the MIT License.


## Acknowledgements

- Built using the Google Gemini API  
- Inspired by vintage computing, classic terminals, and early web aesthetics

