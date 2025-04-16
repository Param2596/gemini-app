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
    

    // Send message to Gemini API
    async sendMessage(message) {
        try {
            // Update status
            document.getElementById('status-message').textContent = "PROCESSING";
            
            // Add user message to our tracking history
            this.addToHistory('user', message);
            
            // First message should include system prompt
            let messageToSend = message;
            if (this.history.length <= 2) {
                messageToSend = `${CONFIG.SYSTEM_PROMPT}\n\nUser: ${message}`;
            }

            // Create request body based on your model version
            const requestBody = {
                contents: [
                    {
                        parts: [
                            {
                                text: messageToSend
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: CONFIG.TEMPERATURE,
                    topK: CONFIG.TOP_K,
                    topP: CONFIG.TOP_P,
                    maxOutputTokens: CONFIG.MAX_TOKENS
                }
            };

            // API endpoint
            const endpoint = `https://generativelanguage.googleapis.com/v1/models/${this.modelName}:generateContent?key=${this.apiKey}`;
            
            console.log("Sending request to Gemini API...");
            
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

    // Add this method to your GeminiAPI class
    async sendMessageWithFiles(message, files) {
        try {
            // Update status
            document.getElementById('status-message').textContent = "PROCESSING";
            
            // Add user message to our tracking history
            this.addToHistory('user', message);
            
            // Create parts array with the text message
            const parts = [{ text: message || "" }];
            
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
                parts.push({
                    inline_data: {
                        mime_type: mimeType,
                        data: base64Data
                    }
                });
            }
            
            // Create request body for Gemini
            const requestBody = {
                contents: [
                    {
                        parts: parts
                    }
                ],
                generationConfig: {
                    temperature: CONFIG.TEMPERATURE,
                    topK: CONFIG.TOP_K,
                    topP: CONFIG.TOP_P,
                    maxOutputTokens: CONFIG.MAX_TOKENS
                }
            };
            
            // API endpoint
            const endpoint = `https://generativelanguage.googleapis.com/v1/models/${this.modelName}:generateContent?key=${this.apiKey}`;
            
            console.log("Sending request with files to Gemini API...");
            
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

// Initialize API client
const geminiAPI = new GeminiAPI(CONFIG.API_KEY, CONFIG.MODEL);
// Make it globally available
window.geminiAPI = geminiAPI;
console.log("GeminiAPI object created and assigned to window.geminiAPI");