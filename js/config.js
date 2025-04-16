// Configuration for the Gemini Retro Terminal

// Replace with your actual Gemini API key
const CONFIG = {
    API_KEY: "AIzaSyDThBfNTVqpKTjRM62Wcf9FnMzchj3fUqA", // Replace this with your actual API key
    MODEL: "gemini-2.0-flash", // Changed to a proper model name
    MAX_TOKENS: 2048,
    TEMPERATURE: 0.7,
    TOP_K: 40,
    TOP_P: 0.95,
    BOOT_SOUND: 'audio.mp3', // Path to your boot sound
    SYSTEM_PROMPT: "You are GEMINI, an AI assistant running on a retro terminal interface. " +
                  "Keep your responses concise and occasionally use tech jargon. " +
                  "Format any code in markdown code blocks. " +
                  "Respond in a slightly robotic but helpful manner."
};