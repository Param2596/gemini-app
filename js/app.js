// Main application initialization

// Initialize the clock
function updateClock() {
    const now = new Date();
    document.getElementById('clock').textContent = now.toLocaleTimeString('en-US', {hour12: false});
}

// Start the clock
setInterval(updateClock, 1000);
updateClock(); // Update immediately on load

// Update the DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
    // Check for stored API keys first
    const storedApiKeys = JSON.parse(localStorage.getItem('geminiApiKeys') || '[]');
    const activeKey = storedApiKeys.find(key => key.active);
    
    if (activeKey && activeKey.value) {
        // Use the stored active API key
        CONFIG.API_KEY = activeKey.value;
        window.initGeminiAPI(activeKey.value);
        console.log("API key loaded from storage and API initialized");
        
        // Initialize the terminal
        const terminal = new RetroTerminal();
        
        // Update memory usage stats randomly to simulate activity
        setInterval(() => {
            const memUsage = 640 + Math.floor(Math.random() * 24);
            document.getElementById('memory-usage').textContent = `MEM: ${memUsage}K`;
        }, 5000);
    } else {
        // Try to fetch key from API if no stored key is available
        fetch('/api/getKey')
            .then(response => {
                console.log("API response status:", response.status);
                if (!response.ok) {
                    throw new Error(`API key fetch failed: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("API response received:", data);
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
                document.getElementById('status-message').textContent = "API KEY NEEDED";
                
                // Show error message in chat
                const chatOutput = document.getElementById('chat-output');
                const errorMsg = document.createElement('div');
                errorMsg.className = 'message error-message';
                errorMsg.textContent = "ERROR: No API key available. Please add one in settings.";
                chatOutput.appendChild(errorMsg);
                
                // Initialize terminal anyway so users can add an API key
                const terminal = new RetroTerminal();
            });
    }
});