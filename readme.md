# Gemini Retro Terminal

A stylish retro terminal interface for interacting with the Google Gemini AI model. This project provides a nostalgic 90s terminal-style interface for chatting with Gemini.

## Live Demo

Check out the live demo: [Gemini Retro Terminal](https://gemini-app-lake.vercel.app/)

This project is a work in progress, and contributions from the community are welcome and appreciated!

## Features

- Retro CRT monitor aesthetics with multiple color themes
- Typewriter-style text animations
- Markdown rendering for AI responses
- File upload capability for Gemini Vision features
- Chat history saving and loading
- Secure API key handling through serverless functions
- Responsive design for mobile and desktop
- Customizable system prompts

## Getting Started

### Prerequisites

- A Google Gemini API key (get one from [Google AI Studio](https://makersuite.google.com/app/apikey))
- Node.js and npm (for local development)
- A Vercel account (for deployment)

### Local Development

1. Clone the repository:
   ```
   git clone <your-repo-url>
   cd gemini-app
   ```

2. Set up your environment variables:
   Create a `.env.local` file in the project root with:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. Serve the app locally using a simple HTTP server:
   ```
   npx serve
   ```

4. Access the app at `http://localhost:3000`

### Deployment on Vercel

1. Fork or clone this repository to your GitHub account

2. Sign up for a [Vercel](https://vercel.com) account if you don't have one

3. Connect your GitHub repository to Vercel:
   - From the Vercel dashboard, click "Add New" > "Project"
   - Select your repository
   - Keep all default settings but add your environment variables

4. Add your environment variables:
   - In the Vercel project settings, add environment variable:
     - `GEMINI_API_KEY`: Your Gemini API key

5. Deploy the project:
   - Vercel will automatically build and deploy your app
   - Once deployed, you'll get a unique URL for your app

## Configuration

You can customize the app by modifying the following files:

- `js/config.js`: Change the Gemini model, system prompt, and other parameters
- `css/styles.css`: Modify the retro terminal appearance
- `index.html`: Add additional UI elements

## Security Notes

This application uses a serverless API route (`/api/getKey.js`) to securely provide the Gemini API key to the frontend application. The API key is never exposed in the client-side code.

The serverless function implements basic security checks:
- Validates the request origin
- Blocks requests from unauthorized sources
- Only returns the API key to requests coming from your allowed domains

## API Configuration

The `/api/getKey.js` function handles API key security. When deployed on Vercel, this function:

1. Validates that requests come from your Vercel domain or other authorized domains
2. Returns the API key only to valid requests
3. Logs API usage for monitoring

## Customizing the Bot Persona

You can modify the bot's personality by changing the `SYSTEM_PROMPT` in `js/config.js`. The default persona is a retro-futuristic terminal AI.

## License

This project is released under the MIT License.

## Acknowledgements

- Built using the Google Gemini API
- Inspired by retro terminal interfaces