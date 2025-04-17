// Main application initialization

// Initialize the clock
function updateClock() {
    const now = new Date();
    document.getElementById('clock').textContent = now.toLocaleTimeString('en-US', {hour12: false});
}

// Start the clock
setInterval(updateClock, 1000);
updateClock(); // Update immediately on load

// Add after initial clock setup
document.addEventListener('DOMContentLoaded', () => {
    // Get API key from environment or a secure endpoint
    fetch('/api/getKey')
        .then(response => {
            if (!response.ok) {
                throw new Error(`API key fetch failed: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data.apiKey) {
                throw new Error("No API key returned from server");
            }
            // Store API key and initialize GeminiAPI
            CONFIG.API_KEY = data.apiKey;
            
            // Initialize the API with the key
            window.initGeminiAPI(data.apiKey);
            
            console.log("API key loaded securely and API initialized");
            
            // Initialize the terminal
            const terminal = new RetroTerminal();
            
            // Update memory usage stats randomly to simulate activity
            setInterval(() => {
                const memUsage = 640 + Math.floor(Math.random() * 24);
                document.getElementById('memory-usage').textContent = `MEM: ${memUsage}K`;
            }, 5000);
        })
        .catch(error => {
            console.error("Failed to load API key:", error);
            document.getElementById('status-message').textContent = "API ERROR";
            
            // Show error message in chat
            const chatOutput = document.getElementById('chat-output');
            const errorMsg = document.createElement('div');
            errorMsg.className = 'message error-message';
            errorMsg.textContent = "ERROR: Failed to load API key. Please check console for details.";
            chatOutput.appendChild(errorMsg);
        });
});