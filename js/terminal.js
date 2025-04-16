// Terminal functionality for the Gemini Retro Terminal

class RetroTerminal {
    constructor() {
        this.chatOutput = document.getElementById('chat-output');
        this.userInput = document.getElementById('user-input');
        this.sendButton = document.getElementById('send-button');
        this.themeSelector = document.getElementById('theme-selector');
        this.bootSound = new Audio(CONFIG.BOOT_SOUND);
        this.isProcessing = false;
        
        this.initializeEventListeners();
        this.initializeTerminal();
    }

    // Initialize event listeners
    initializeEventListeners() {
        // Theme selector
        this.themeSelector.addEventListener('change', (e) => {
            document.documentElement.setAttribute('data-theme', e.target.value);
        });

        // Send button
        this.sendButton.addEventListener('click', () => {
            this.sendMessage();
        });

        // Enter key in input field
        this.userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
    }

    // Initialize the terminal with boot sequence
    initializeTerminal() {
        // Create initial boot prompt
        const bootPrompt = document.createElement('div');
        bootPrompt.className = 'message bot-message';
        bootPrompt.innerHTML = 'SYSTEM: Terminal ready. <button id="boot-system" style="background-color: var(--input-bg); color: var(--text-color); border: 1px solid var(--border-color); cursor: pointer; padding: 5px 10px; font-family: inherit;">INITIALIZE SYSTEM</button>';
        
        this.chatOutput.innerHTML = ''; // Clear existing messages
        this.chatOutput.appendChild(bootPrompt);
        
        // Setup boot sequence to run after button click
        document.getElementById('boot-system').addEventListener('click', () => {
            this.bootSystem();
        });
    }

    // Boot system sequence
    bootSystem() {
        // Check if API is available
        if (!window.geminiAPI) {
            this.addMessage('error', 'CRITICAL ERROR: Gemini API not initialized. Check console for details.');
            document.getElementById('status-message').textContent = "API ERROR";
            return;
        }
        
        // Play boot sound if available
        if (this.bootSound && this.bootSound.play) {
            this.bootSound.play().catch(e => console.log('Audio playback error:', e));
        }
        
        // Clear chat and show boot sequence
        this.chatOutput.innerHTML = '';
        
        const steps = [
            "BIOS v3.2.1 - Initializing memory...",
            "Memory check: 640K OK",
            "Loading GEMINI/OS v2.5...",
            "GEMINI Kernel loaded.",
            "Initializing neural interface...",
            "Network connection: OK",
            "Loading language modules...",
            "Loading creativity engines...",
            "Loading knowledge base...",
            "GEMINI AI ready for interaction."
        ];
        
        // Display boot sequence with delay
        let delay = 150;
        steps.forEach((step, index) => {
            setTimeout(() => {
                this.addMessage('bot', step);
                
                // If last step, add welcome message after another delay
                if (index === steps.length - 1) {
                    setTimeout(() => {
                        this.addMessage('bot', "Hello! I'm GEMINI. How can I assist you today?");
                        document.getElementById('user-input').disabled = false;
                        document.getElementById('send-button').disabled = false;
                        document.getElementById('status-message').textContent = "READY";
                        document.getElementById('user-input').focus();
                    }, delay);
                }
            }, delay * index);
        });
        
        // Disable input during boot sequence
        document.getElementById('user-input').disabled = true;
        document.getElementById('send-button').disabled = true;
        document.getElementById('status-message').textContent = "BOOTING";
    }

    // Add a message to the chat
    addMessage(type, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        
        if (type === 'user') {
            messageDiv.textContent = `YOU: ${content}`;
        } else if (type === 'error') {
            messageDiv.className = 'message error-message';
            messageDiv.textContent = `ERROR: ${content}`;
        } else {
            // For bot messages, render markdown
            messageDiv.innerHTML = this.renderMarkdown(content);
        }
        
        this.chatOutput.appendChild(messageDiv);
        this.chatOutput.scrollTop = this.chatOutput.scrollHeight;
    }

    // Simple markdown rendering
    renderMarkdown(text) {
        // Handle code blocks with language specification
        text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
            return `<pre><code>${this.escapeHtml(code.trim())}</code></pre>`;
        });
        
        // Handle inline code
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Handle bold text
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // Handle italic text
        text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        
        // Handle lists (simple)
        text = text.replace(/^\s*-\s+(.+)$/gm, '<li>$1</li>');
        text = text.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        // Handle headers
        text = text.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        text = text.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        text = text.replace(/^# (.*$)/gm, '<h1>$1</h1>');

        // Handle paragraphs
        text = text.replace(/\n\s*\n/g, '\n<br><br>\n');
        
        return text;
    }
    
    // Escape HTML to prevent XSS
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;") // Fixed the typo here
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Send message to API
    async sendMessage() {
        const message = this.userInput.value.trim();
        
        if (message === '' || this.isProcessing || !window.geminiAPI) {
            return;
        }
        
        // Clear input field
        this.userInput.value = '';
        
        // Add user message to chat
        this.addMessage('user', message);
        
        // Set processing state
        this.isProcessing = true;
        this.sendButton.disabled = true;
        document.getElementById('status-message').textContent = "PROCESSING";
        
        try {
            // Send to Gemini API
            const response = await window.geminiAPI.sendMessage(message);
            
            // Add response to chat
            this.addMessage('bot', response);
        } catch (error) {
            console.error('Error sending message:', error);
            this.addMessage('error', 'Failed to get response. Check the console for details.');
        } finally {
            // Reset processing state
            this.isProcessing = false;
            this.sendButton.disabled = false;
            document.getElementById('status-message').textContent = "READY";
            this.userInput.focus();
        }
    }
    
    // Update the clock in status bar
    updateClock() {
        const now = new Date();
        document.getElementById('clock').textContent = now.toLocaleTimeString('en-US', {hour12: false});
    }
}