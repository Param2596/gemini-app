// API handling for the Gemini Retro Terminal using direct REST API calls

class GeminiAPI {
    constructor(apiKey, modelName) {
        this.apiKey = apiKey;
        this.modelName = modelName;
        this.history = [];
        
        console.log("GeminiAPI initialized with model: " + this.modelName);
    }
    
    // Add message to history for tracking
    addToHistory(role, content) {
        this.history.push({ role, content });
    }

    // Clear chat history
    clearHistory() {
        this.history = [];
    }

          // Add this method to the GeminiAPI class in js/api.js
    // This should be added after the clearHistory() method
    
    loadChatHistory(messages) {
        // Clear any existing history first
        this.clearHistory();
        
        // Load messages from saved chat
        messages.forEach(msg => {
            this.addToHistory(msg.role, msg.content);
        });
        
        console.log("Chat history loaded:", messages.length, "messages");
    }

    async listAvailableModels() {
        try {
            const endpoint = `https://generativelanguage.googleapis.com/v1/models?key=${this.apiKey}`;
            const response = await fetch(endpoint);
            const data = await response.json();
            console.log("Available models:", data);
            return data;
        } catch (error) {
            console.error("Error listing models:", error);
            throw error;
        }
    }
    

    // Update sendMessage method to include conversation history

    async sendMessage(message) {
        try {
            // Update status
            document.getElementById('status-message').textContent = "PROCESSING";
            
            // Add user message to our tracking history
            this.addToHistory('user', message);
            
            // Build the conversation content for the API request
            const contents = [];
            
            // First message should include system prompt as a separate message
            if (this.history.length <= 2) {
                // For the first exchange, send system prompt separately followed by user message
                contents.push({
                    role: "user",
                    parts: [{ text: CONFIG.SYSTEM_PROMPT }]
                });
                
                contents.push({
                    role: "model",
                    parts: [{ text: "I understand and will act as SYNTRA with the personality you described." }]
                });
            } else {
                // For subsequent exchanges, include all previous history
                // Start with system prompt
                contents.push({
                    role: "user", 
                    parts: [{ text: CONFIG.SYSTEM_PROMPT }]
                });
                
                contents.push({
                    role: "model",
                    parts: [{ text: "I understand and will act as SYNTRA with the personality you described." }]
                });
                
                // Add all conversation history (skipping first two items which were system messages)
                // Use the entire history instead of limiting to 20 messages
                const historyToInclude = this.history.slice(0, -1);
                
                for (const item of historyToInclude) {
                    contents.push({
                        role: item.role === 'user' ? 'user' : 'model',
                        parts: [{ text: item.content }]
                    });
                }
            }
            
            // Add the current user message
            contents.push({
                role: "user",
                parts: [{ text: message }]
            });

            // Create request body with conversation history
            const requestBody = {
                contents: contents,
                generationConfig: {
                    temperature: CONFIG.TEMPERATURE,
                    topK: CONFIG.TOP_K,
                    topP: CONFIG.TOP_P,
                    maxOutputTokens: CONFIG.MAX_TOKENS
                }
            };

            // API endpoint
            const endpoint = `https://generativelanguage.googleapis.com/v1/models/${this.modelName}:generateContent?key=${this.apiKey}`;
            
            console.log("Sending request to Gemini API with conversation history...");
            
            // Make the API call
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("API response error:", errorData);
                throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            console.log("API response received:", data);
            
            if (!data.candidates || data.candidates.length === 0) {
                throw new Error("No response generated");
            }
            
            // Extract the response text
            const responseText = data.candidates[0].content.parts[0].text;
            
            // Add bot response to our tracking history
            this.addToHistory('model', responseText);
            
            // Update status
            document.getElementById('status-message').textContent = "READY";
            
            return responseText;
            
        } catch (error) {
            console.error('Error calling Gemini API:', error);
            document.getElementById('status-message').textContent = "ERROR";
            throw error;
        }
    }

    // Update sendMessageWithFiles to include conversation history

    async sendMessageWithFiles(message, files) {
        try {
            // Update status
            document.getElementById('status-message').textContent = "PROCESSING";
            
            // Add user message to our tracking history
            this.addToHistory('user', message || ""); // Handle empty message case
            
            // Create parts array for the current message including files
            const currentParts = [];
            
            // Add text message if provided
            if (message && message.trim()) {
                currentParts.push({ text: message });
            }
            
            // Add each file as a part
            for (const fileData of files) {
                // Determine file type and format for API
                const file = fileData.file;
                let mimeType = file.type;
                
                // Default to application/octet-stream if mime type is empty
                if (!mimeType) {
                    mimeType = "application/octet-stream";
                }
                
                // Get file data (assumes it's already in base64 format from the calling function)
                const fileContent = fileData.data;
                
                // For images, the data is already in data:image/jpeg;base64,... format
                // We need to strip the prefix
                let base64Data = fileContent;
                if (base64Data.startsWith('data:')) {
                    base64Data = base64Data.split(',')[1];
                }
                
                // Add file part
                currentParts.push({
                    inline_data: {
                        mime_type: mimeType,
                        data: base64Data
                    }
                });
            }
            
            // Build full conversation content including history
            const contents = [];
            
            // Always include system prompt as the first message
            contents.push({
                role: "user",
                parts: [{ text: CONFIG.SYSTEM_PROMPT }]
            });
            
            contents.push({
                role: "model",
                parts: [{ text: "I understand and will act as SYNTRA with the personality you described." }]
            });
            
            // Include all conversation history (if not the first exchange)
            // Skip the last item which was just added and will be included separately
            const historyToInclude = this.history.slice(2, -1);
            
            for (const item of historyToInclude) {
                contents.push({
                    role: item.role === 'user' ? 'user' : 'model',
                    parts: [{ text: item.content }]
                });
            }
            
            // Add current message with files
            contents.push({
                role: "user",
                parts: currentParts
            });
            
            // Create request body for Gemini
            const requestBody = {
                contents: contents,
                generationConfig: {
                    temperature: CONFIG.TEMPERATURE,
                    topK: CONFIG.TOP_K,
                    topP: CONFIG.TOP_P,
                    maxOutputTokens: CONFIG.MAX_TOKENS
                }
            };
            
            // API endpoint
            const endpoint = `https://generativelanguage.googleapis.com/v1/models/${this.modelName}:generateContent?key=${this.apiKey}`;
            
            console.log("Sending request with files and history to Gemini API...");
            
            // Make the API call
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error("API response error:", errorData);
                throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
            }
            
            const data = await response.json();
            console.log("API response received:", data);
            
            if (!data.candidates || data.candidates.length === 0) {
                throw new Error("No response generated");
            }
            
            // Extract the response text
            const responseText = data.candidates[0].content.parts[0].text;
            
            // Add bot response to our tracking history
            this.addToHistory('model', responseText);
            
            // Update status
            document.getElementById('status-message').textContent = "READY";
            
            return responseText;
            
        } catch (error) {
            console.error('Error calling Gemini API with files:', error);
            document.getElementById('status-message').textContent = "ERROR";
            throw error;
        }
    }
}

// Don't initialize right away - we'll do this after fetching the API key
console.log("GeminiAPI class ready, waiting for API key");

// Export a function to initialize the API with a key
window.initGeminiAPI = function(apiKey) {
  window.geminiAPI = new GeminiAPI(apiKey, CONFIG.MODEL);
  
  // Add updateApiKey method to the API instance
  window.geminiAPI.updateApiKey = function(newApiKey) {
    this.apiKey = newApiKey;
    console.log("API key updated successfully");
    return true;
  };
  
  console.log("GeminiAPI initialized with API key");
  return window.geminiAPI;
};
