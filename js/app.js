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
        .then(response => response.json())
        .then(data => {
            CONFIG.API_KEY = data.apiKey;
            console.log("API key loaded securely");
            
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
        });
});