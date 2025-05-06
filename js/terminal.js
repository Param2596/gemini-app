// Terminal functionality for the Gemini Retro Terminal

class RetroTerminal {
    constructor() {
        this.chatOutput = document.getElementById('chat-output');
        this.userInput = document.getElementById('user-input');
        this.sendButton = document.getElementById('send-button');
        this.themeSelector = document.getElementById('theme-selector');
        this.bootSound = new Audio(CONFIG.BOOT_SOUND);
        this.isProcessing = false;
        this.lastTypingCancellation = null;
        this.currentConversationId = Date.now().toString();
        this.attachedFiles = [];

        // Update Remarkable initialization
        try {
            this.md = new Remarkable('full', {
                html: false,
                xhtmlOut: false,
                breaks: true,
                langPrefix: 'language-',
                linkTarget: '_blank',
                typographer: true,
                highlight: function (str, lang) {
                    if (window.hljs && lang && window.hljs.getLanguage(lang)) {
                        try {
                            return window.hljs.highlight(str, {language: lang}).value;
                        } catch (err) {
                            console.error('Highlight.js error:', err);
                        }
                    }
                    return ''; // Use external default escaping
                }
            });

            console.log('Remarkable initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Remarkable:', error);
            this.md = null;
        }

        // REMOVE OR COMMENT OUT THIS ENTIRE BLOCK:
        // this.md.use((remarkable) => {
        //     const defaultFenceRender = remarkable.renderer.rules.fence;
        //     remarkable.renderer.rules.fence = (tokens, idx, options, env, slf) => {
        //         const originalHtml = defaultFenceRender(tokens, idx, options, env, slf);
        //         if (originalHtml && originalHtml.trim() !== '') {
        //              return `<div class="code-block-container"><button class="copy-button">COPY</button>${originalHtml}</div>`;
        //         }
        //         return originalHtml;
        //     };
        // });
        // END OF BLOCK TO REMOVE/COMMENT OUT

        this.initializeEventListeners();
        this.initializeHeaderControls(); // Changed from initializeTerminal
        this.initializeHistoryPanel(); // Renamed for clarity
        this.initializeSettingsPanel(); // Add this line
        this.initializeFileUpload();

        // Auto-save chat when window is closed
        window.addEventListener('beforeunload', () => {
            this.saveCurrentChat();
        });

        // Auto-save chat periodically
        setInterval(() => this.saveCurrentChat(), 60000);
    }

    // New method to save last conversation timestamp
    saveLastConversationTimestamp() {
        localStorage.setItem('lastConversationTime', new Date().toISOString());
    }

    // New method to get time elapsed since last conversation
    getTimeSinceLastConversation() {
        const lastTime = localStorage.getItem('lastConversationTime');
        if (!lastTime) return null;

        const lastDate = new Date(lastTime);
        const currentDate = new Date();
        const diffMs = currentDate - lastDate;

        // Calculate time differences
        const seconds = Math.floor(diffMs / 1000);
        if (seconds < 60) return `${seconds} seconds`;

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''}`;

        const days = Math.floor(hours / 24);
        if (days < 30) return `${days} day${days !== 1 ? 's' : ''}`;

        const months = Math.floor(days / 30);
        if (months < 12) return `${months} month${months !== 1 ? 's' : ''}`;

        const years = Math.floor(months / 12);
        return `${years} year${years !== 1 ? 's' : ''}`;
    }

    // Initialize event listeners
    initializeEventListeners() {
        // Load saved theme if available
        const savedTheme = localStorage.getItem('geminiTerminalTheme');
        if (savedTheme) {
            this.themeSelector.value = savedTheme;
            document.documentElement.setAttribute('data-theme', savedTheme);
        }

        // Theme selector
        this.themeSelector.addEventListener('change', (e) => {
            const theme = e.target.value;
            document.documentElement.setAttribute('data-theme', theme);
            // Save theme preference to localStorage
            localStorage.setItem('geminiTerminalTheme', theme);
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

    // Renamed and updated to handle all header buttons
    initializeHeaderControls() {
        // First, save the existing content if there's any real conversation
        if (this.chatOutput && this.chatOutput.querySelectorAll('.user-message').length > 0) {
            this.saveCurrentChat();
        }

        const controlsDiv = document.querySelector('#terminal-controls');
        controlsDiv.innerHTML = ''; // Clear existing controls first

        // Add NEW CHAT button
        const newChatButton = document.createElement('button');
        newChatButton.id = 'new-chat-button-header';
        newChatButton.className = 'header-button'; // Simplified class name
        newChatButton.textContent = 'NEW CHAT';
        newChatButton.onclick = () => this.startNewChat();
        controlsDiv.appendChild(newChatButton);

        // Add HISTORY button
        const historyButton = document.createElement('button');
        historyButton.id = 'history-button';
        historyButton.className = 'header-button'; // Simplified class name
        historyButton.textContent = 'HISTORY';
        historyButton.onclick = () => this.toggleHistoryPanel();
        controlsDiv.appendChild(historyButton);

        // Add SETTINGS button
        const settingsButton = document.createElement('button');
        settingsButton.id = 'settings-button';
        settingsButton.className = 'header-button'; // Simplified class name
        settingsButton.textContent = 'SETTINGS';
        settingsButton.onclick = () => this.toggleSettingsPanel();
        controlsDiv.appendChild(settingsButton);

        // Add Theme Selector (keeping existing structure)
        const themeWrapper = document.createElement('div');
        themeWrapper.className = 'select-wrapper';
        themeWrapper.appendChild(this.themeSelector); // Use the existing selector
        controlsDiv.appendChild(themeWrapper);


        // Create initial boot prompt with system styling
        const bootPrompt = document.createElement('div');
        bootPrompt.className = 'message system-message'; // Changed from bot-message
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

        // CHANGE: Create a single combined boot message
        const bootSteps = [
            "BIOS v3.2.1 - Initializing memory...",
            "Memory check: 640K OK",
            `Loading ${CONFIG.BOT_NAME}/OS v2.5...`,
            `${CONFIG.BOT_NAME} Kernel loaded.`,
            "Initializing neural interface...",
            "Network connection: OK",
            "Loading language modules...",
            "Loading creativity engines...",
            "Loading knowledge base...",
            `${CONFIG.BOT_NAME} AI ready for interaction.`
        ];

        // Create a single message with all boot steps
        const bootContent = bootSteps.join('\n');

        // Create boot message element directly (bypassing addMessage)
        const bootMessageDiv = document.createElement('div');
        bootMessageDiv.className = 'message boot-message'; // Changed: Removed bot-message class
        bootMessageDiv.innerHTML = `<pre class="boot-text">${bootContent}</pre>`;
        this.chatOutput.appendChild(bootMessageDiv);

        let delay = 150;
        let currentStepIndex = 0;

        // Display boot sequence one step at a time
        const bootInterval = setInterval(() => {
            if (currentStepIndex < bootSteps.length) {
                // Show up to the current step
                bootMessageDiv.innerHTML = `<pre class="boot-text">${bootSteps.slice(0, currentStepIndex + 1).join('\n')}</pre>`;
                currentStepIndex++;
                this.chatOutput.scrollTop = this.chatOutput.scrollHeight;
            } else {
                // Boot sequence complete
                clearInterval(bootInterval);

                // Add welcome message as a separate message with cursor
                setTimeout(() => {
                    // Add separator between boot sequence and conversation
                    const separator = document.createElement('div');
                    separator.className = 'message-separator';
                    this.chatOutput.appendChild(separator);
                    
                    // Now add the welcome message
                    this.addMessage('bot', `Hello! I'm ${CONFIG.BOT_NAME}. How can I assist you today?`);
                    
                    document.getElementById('user-input').disabled = false;
                    document.getElementById('send-button').disabled = false;
                    document.getElementById('status-message').textContent = "READY";
                    document.getElementById('user-input').focus();
                }, delay);
            }
        }, delay);

        // Disable input during boot sequence
        document.getElementById('user-input').disabled = true;
        document.getElementById('send-button').disabled = true;
        document.getElementById('status-message').textContent = "BOOTING";
    }

    // Add a message to the chat
    addMessage(type, content, isFromHistory = false) {
        const messageDiv = document.createElement('div');
        // Store raw markdown/text for history reloads
        messageDiv.dataset.rawContent = content;
        messageDiv.className = `message ${type}-message`;
    
        if (type === 'user') {
            messageDiv.textContent = `YOU: ${content}`;
            this.chatOutput.appendChild(messageDiv);
            this.chatOutput.scrollTop = this.chatOutput.scrollHeight;
        } else if (type === 'error') {
            // Error message handling (unchanged)
            messageDiv.className = 'message error-message';
            messageDiv.textContent = `ERROR: ${content}`;
            this.chatOutput.appendChild(messageDiv);
            this.chatOutput.scrollTop = this.chatOutput.scrollHeight;
        } else {
            // Bot message container
            const messageContentDiv = document.createElement('div');
            messageContentDiv.className = 'message-content';
            
            // Add message content div to parent message div
            messageDiv.appendChild(messageContentDiv);
            
            // Add to chat container
            this.chatOutput.appendChild(messageDiv);
            
            if (isFromHistory) {
                // For messages from history, render markdown directly
                messageContentDiv.innerHTML = this.renderMarkdown(content);
                
                // Process code blocks for history messages
                const preElements = messageContentDiv.querySelectorAll('pre');
                preElements.forEach(preElement => {
                    const codeBlock = preElement.querySelector('code');
                    if (codeBlock) {
                        // Create container for the code block
                        const container = document.createElement('div');
                        container.className = 'code-block-container';
                        
                        // Create copy button
                        const copyButton = document.createElement('button');
                        copyButton.className = 'copy-button';
                        copyButton.textContent = 'COPY';
                        copyButton.onclick = () => {
                            const code = codeBlock.textContent;
                            this.copyToClipboard(code);
                        };
                        
                        // Wrap the pre element with the container and add the button
                        preElement.parentNode.insertBefore(container, preElement);
                        container.appendChild(copyButton);
                        container.appendChild(preElement);
                    }
                });
                
                // Add separator after message (except for welcome/boot messages)
                if (!content.includes('BIOS') && !content.includes(`Hello! I'm ${CONFIG.BOT_NAME}`)) {
                    const separator = document.createElement('div');
                    separator.className = 'message-separator';
                    messageDiv.appendChild(separator);
                    
                    // Add action buttons
                    const actionsDiv = document.createElement('div');
                    actionsDiv.className = 'message-actions';
                    
                    // Copy button
                    const copyButton = document.createElement('button');
                    copyButton.className = 'message-action-button';
                    copyButton.textContent = 'COPY';
                    copyButton.onclick = () => this.copyToClipboard(content);
                    
                    // Regenerate button
                    const regenerateButton = document.createElement('button');
                    regenerateButton.className = 'message-action-button';
                    regenerateButton.textContent = 'REGENERATE';
                    regenerateButton.onclick = () => this.regenerateResponse();
                    
                    // Add buttons to actions
                    actionsDiv.appendChild(copyButton);
                    actionsDiv.appendChild(regenerateButton);
                    
                    // Add actions to message
                    messageDiv.appendChild(actionsDiv);
                }
            } else {
                // Existing code for new messages with typing animation
                this.typeText(messageContentDiv, content).then(() => {
                    // Process code blocks for new messages
                    const preElements = messageContentDiv.querySelectorAll('pre');
                    preElements.forEach(preElement => {
                        const codeBlock = preElement.querySelector('code');
                        if (codeBlock) {
                            // Create container for the code block
                            const container = document.createElement('div');
                            container.className = 'code-block-container';
                            
                            // Create copy button
                            const copyButton = document.createElement('button');
                            copyButton.className = 'copy-button';
                            copyButton.textContent = 'COPY';
                            copyButton.onclick = () => {
                                const code = codeBlock.textContent;
                                this.copyToClipboard(code);
                            };
                            
                            // Wrap the pre element with the container and add the button
                            preElement.parentNode.insertBefore(container, preElement);
                            container.appendChild(copyButton);
                            container.appendChild(preElement);
                        }
                    });
                    
                    // Remove any leftover typing cursors
                    const cursors = messageContentDiv.querySelectorAll('.typing-cursor');
                    cursors.forEach(c => c.remove());
                    
                    // Only add separator and buttons for normal bot messages
                    if (!content.includes('BIOS') && !content.includes(`Hello! I'm ${CONFIG.BOT_NAME}`)) {
                        const separator = document.createElement('div');
                        separator.className = 'message-separator';
                        messageDiv.appendChild(separator);
                        
                        // Add action buttons
                        const actionsDiv = document.createElement('div');
                        actionsDiv.className = 'message-actions';
                        
                        // Copy button
                        const copyButton = document.createElement('button');
                        copyButton.className = 'message-action-button';
                        copyButton.textContent = 'COPY';
                        copyButton.onclick = () => this.copyToClipboard(content);
                        
                        // Regenerate button
                        const regenerateButton = document.createElement('button');
                        regenerateButton.className = 'message-action-button';
                        regenerateButton.textContent = 'REGENERATE';
                        regenerateButton.onclick = () => this.regenerateResponse();
                        
                        // Add buttons to actions
                        actionsDiv.appendChild(copyButton);
                        actionsDiv.appendChild(regenerateButton);
                        
                        // Add actions to message
                        messageDiv.appendChild(actionsDiv);
                    }
                    
                    // Scroll to ensure everything is visible
                    this.chatOutput.scrollTop = this.chatOutput.scrollHeight;
                });
            }
            
            // Scroll to ensure message is visible
            this.chatOutput.scrollTop = this.chatOutput.scrollHeight;
        }
    }
    // Update renderMarkdown to handle cases where Remarkable isn't available
    renderMarkdown(text) {
        if (!this.md) {
            console.warn('Remarkable not initialized, falling back to plain text');
            return this.escapeHtml(text);
        }

        try {
            // Pre-process custom terminal elements
            text = this.preprocessText(text);

            // Convert markdown to HTML using remarkable
            let html = this.md.render(text);

            // Post-process for terminal-specific styling
            html = this.postprocessHtml(html);

            return html;
        } catch (error) {
            console.error('Markdown rendering error:', error);
            return this.escapeHtml(text);
        }
    }

    // Add helper methods
    preprocessText(text) {
        // Handle terminal-specific pre-processing
        // For example, replace ASCII art markers or custom syntax
        return text;
    }

    postprocessHtml(html) {
        // // Wrap every <pre><code…>…</code></pre> in a container + copy button
        // html = html.replace(
        //     /<pre><code([^>]*)>/g,
        //     '<div class="code-block-container"><button class="copy-button">COPY</button><pre><code$1>'
        // );
        // html = html.replace(
        //     /<\/code><\/pre>/g,
        //     '</code></pre></div>'
        // );

        // Ensure images have proper terminal styling
        html = html.replace(/<img /g, '<img class="rendered-image" ');

        return html;
    }

    // Escape HTML to prevent XSS
    escapeHtml(unsafe) { // Keep this method
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;") // Fixed the typo here
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Modified sendMessage method to track conversation time
    async sendMessage() {
        // Add this at the beginning of the method
        const isFirstMessage = this.chatOutput.querySelectorAll('.user-message').length === 0;

        // Rest of the existing code...
        const message = this.userInput.value.trim();

        // Allow sending just files without text
        if (message === '' && this.attachedFiles.length === 0) return;

        if (this.isProcessing || !window.geminiAPI) return;

        // Set processing state
        this.isProcessing = true;
        this.sendButton.disabled = true;
        document.getElementById('status-message').textContent = "PROCESSING";

        // Clear input field
        this.userInput.value = '';

        try {
            // Remove any existing cursor before adding new message
            this.removeCursors();

            // Create display message with file info
            let displayMessage = message;
            if (this.attachedFiles.length > 0) {
                const fileNames = this.attachedFiles.map(file => file.name).join(', ');
                if (displayMessage) displayMessage += '\n\n';
                displayMessage += `[Attached files: ${fileNames}]`;
            }

            // Add user message to chat
            this.addMessage('user', displayMessage);

            // Add a typing indicator message with cursor
            const loadingMsg = document.createElement('div');
            loadingMsg.className = 'message bot-message loading-message';
            loadingMsg.innerHTML = `<span>${CONFIG.BOT_NAME} is thinking</span> <span class="typing-cursor"></span>`;
            this.chatOutput.appendChild(loadingMsg);
            this.chatOutput.scrollTop = this.chatOutput.scrollHeight;

            let response;

            // If this is the first message of the conversation, add time context
            if (isFirstMessage) {
                // Get time since last conversation
                const timeSinceLastChat = this.getTimeSinceLastConversation();
                const currentDateTime = new Date().toLocaleString();

                // Create a context message to send to the API
                let contextMessage = `Current date and time: ${currentDateTime}.`;
                if (timeSinceLastChat) {
                    contextMessage += ` It has been ${timeSinceLastChat} since our last conversation.`;
                }

                // Send the context message to the API first
                await window.geminiAPI.sendMessage(contextMessage, true); // true means don't display this message
            }

            // Continue with existing file handling and API calls
            if (this.attachedFiles.length > 0) {
                // Convert files to appropriate format
                const filePromises = this.attachedFiles.map(file => {
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();

                        reader.onload = () => {
                            resolve({
                                file: file,
                                data: reader.result
                            });
                        };

                        reader.onerror = () => {
                            reject(new Error(`Failed to read file: ${file.name}`));
                        };

                        // Read file as data URL (base64)
                        reader.readAsDataURL(file);
                    });
                });

                const fileData = await Promise.all(filePromises);
                response = await window.geminiAPI.sendMessageWithFiles(message, fileData);

                // Clear attached files and hide preview container AFTER successful processing/sending
                this.attachedFiles = [];
                document.getElementById('file-preview-container').innerHTML = '';
                document.getElementById('file-preview-container').style.display = 'none'; // Hide it
            } else {
                // Regular message without files
                response = await window.geminiAPI.sendMessage(message);
            }

            // Remove the loading message
            if (loadingMsg.parentNode) {
                this.chatOutput.removeChild(loadingMsg);
            }

            // Add response to chat
            if (response) { // Check if response exists (might not if only files were sent and API doesn't return text)
                this.addMessage('bot', response);
            }

            // Save the timestamp of this conversation
            this.saveLastConversationTimestamp();
        } catch (error) {
            console.error('Error sending message:', error);
            // Remove any loading message
            const loadingMsg = document.querySelector('.loading-message');
            if (loadingMsg && loadingMsg.parentNode) {
                this.chatOutput.removeChild(loadingMsg);
            }
            this.addMessage('error', `Failed to get response: ${error.message}`);
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

    // Update typeText to properly handle markdown chunks
    typeText(element, text, speed = 10, chunkDelay = 200) { // Restore this function
        return new Promise(resolve => {
            // Clear the element first
            element.innerHTML = '';

            // Cancel any previous typing animation for this element
            if (this.lastTypingCancellation) {
                this.lastTypingCancellation();
            }

            // Split into paragraphs or code blocks
            // Regex to split by triple backticks (keeping delimiters) or double newlines
            const chunks = text.split(/(\n```[\s\S]*?\n```\n?|\n\s*\n)/g).filter(Boolean);

            let current = 0;
            let typingTimeout;

            const typeChunk = () => {
                if (current < chunks.length) {
                    // Get all chunks up to current
                    const partialText = chunks.slice(0, current + 1).join(''); // Join without extra newlines here
                    // Render markdown for the complete partial text
                    element.innerHTML = this.renderMarkdown(partialText);

                    // Scroll to bottom
                    if (element.parentElement) {
                         element.parentElement.scrollTop = element.parentElement.scrollHeight;
                    }

                    current++;
                    // Use chunkDelay for the timeout between chunks
                    typingTimeout = setTimeout(typeChunk, chunkDelay);
                } else {
                    this.lastTypingCancellation = null; // Clear cancellation function
                    resolve(); // Resolve when all chunks are processed
                }
            };

             // Store a function to cancel this specific typing animation
            this.lastTypingCancellation = () => {
                clearTimeout(typingTimeout);
                this.lastTypingCancellation = null;
                 // Resolve immediately if cancelled to proceed to final render/wrap
                 resolve();
            };

            typeChunk(); // Start typing chunks
        });
    }

    // Utility method to copy text to clipboard
    copyToClipboard(text) {
        navigator.clipboard.writeText(text)
            .then(() => {
                document.getElementById('status-message').textContent = "COPIED TO CLIPBOARD";
                setTimeout(() => {
                    document.getElementById('status-message').textContent = "READY";
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy: ', err);
                document.getElementById('status-message').textContent = "COPY FAILED";
            });
    }

    // Regenerate the last response
    regenerateResponse() {
        // Get last user message to resend
        const lastUserMessage = this.getLastUserMessage();
        if (lastUserMessage) {
            // Remove the last bot message
            const messages = this.chatOutput.querySelectorAll('.bot-message');
            if (messages.length > 0) {
                const lastBotMessage = messages[messages.length - 1];
                this.chatOutput.removeChild(lastBotMessage);
            }

            // Resend the query
            this.resendMessage(lastUserMessage);
        }
    }

    // Get the last user message
    getLastUserMessage() {
        const userMessages = this.chatOutput.querySelectorAll('.user-message');
        if (userMessages.length > 0) {
            const lastMessage = userMessages[userMessages.length - 1];
            return lastMessage.textContent.replace('YOU: ', '');
        }
        return null;
    }

    // Resend a message to the API
    async resendMessage(message) {
        // Set processing state
        this.isProcessing = true;
        this.sendButton.disabled = true;
        document.getElementById('status-message').textContent = "PROCESSING";
        document.getElementById('status-message').classList.add('loading');

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
            document.getElementById('status-message').classList.remove('loading');
            this.userInput.focus();
        }
    }

    // Renamed from initializeHistory
    initializeHistoryPanel() {
        // Create history panel (hidden initially)
        const historyPanel = document.createElement('div');
        historyPanel.id = 'history-panel';
        historyPanel.className = 'side-panel history-panel'; // Added common class
        historyPanel.style.display = 'none';

        const historyHeader = document.createElement('div');
        historyHeader.className = 'panel-header'; // Common class
        historyHeader.innerHTML = '<span>CHAT HISTORY</span><button class="close-panel-button" data-panel="history-panel">X</button>';

        const historyList = document.createElement('div');
        historyList.id = 'history-list';
        historyList.className = 'panel-content history-list'; // Common class

        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'panel-buttons history-buttons-container'; // Common class

        const newChatButton = document.createElement('button');
        newChatButton.id = 'new-chat-button';
        newChatButton.className = 'terminal-button';
        newChatButton.textContent = 'NEW CHAT';
        newChatButton.onclick = () => this.startNewChat();

        const deleteAllButton = document.createElement('button');
        deleteAllButton.id = 'delete-all-button';
        deleteAllButton.className = 'terminal-button delete-all';
        deleteAllButton.textContent = 'DELETE ALL';
        deleteAllButton.onclick = () => this.deleteAllChats();

        buttonsContainer.appendChild(newChatButton);
        buttonsContainer.appendChild(deleteAllButton);

        historyPanel.appendChild(historyHeader);
        historyPanel.appendChild(historyList);
        historyPanel.appendChild(buttonsContainer);

        document.querySelector('#crt-container').appendChild(historyPanel);

        // Add close button listener using event delegation
        historyHeader.querySelector('.close-panel-button').addEventListener('click', (e) => {
            this.toggleHistoryPanel(); // Use the toggle function
        });

        // Load saved chats
        this.loadSavedChats();
    }

    // Toggle history panel visibility
    toggleHistoryPanel() {
        const panel = document.querySelector('#history-panel');
        const settingsPanel = document.querySelector('#settings-panel');
        if (panel.style.display === 'none') {
             // Hide settings panel if open
            if (settingsPanel.style.display !== 'none') {
                settingsPanel.style.display = 'none';
            }
            panel.style.display = 'flex';
            this.loadSavedChats(); // Refresh the list when opening
        } else {
            panel.style.display = 'none';
        }
    }

    // Update saveCurrentChat to filter out boot/welcome messages

    saveCurrentChat() {
        // Only save if we have messages
        if (this.chatOutput.querySelectorAll('.message').length < 3) return; // Ignore boot

        const savedChats = JSON.parse(localStorage.getItem('geminiChats') || '[]');
        const chatMessages = [];
        const messages = this.chatOutput.querySelectorAll('.message');
        let foundRealConversation = false;

        messages.forEach(msg => {
            if (msg.classList.contains('boot-message')) return;

            if (msg.classList.contains('user-message')) {
                foundRealConversation = true;
                chatMessages.push({
                    role: 'user',
                    content: msg.textContent.replace('YOU: ', '')
                });
            } else if (msg.classList.contains('bot-message')) {
                // Use rawContent if saved, otherwise fallback
                const content = msg.dataset.rawContent 
                    ?? (msg.querySelector('.message-content')?.textContent || msg.textContent);

                // Skip welcome messages
                if (content.includes(`Hello! I'm ${CONFIG.BOT_NAME}`)) return;

                if (foundRealConversation) {
                    chatMessages.push({ role: 'bot', content });
                }
            }
        });

        if (chatMessages.length < 1) return;

        // Use first user message as title, or first few words if very long
        let chatTitle = "New Chat";
        for (const msg of chatMessages) {
            if (msg.role === 'user') {
                chatTitle = msg.content.length > 30 ?
                    msg.content.substring(0, 30) + '...' :
                    msg.content;
                break;
            }
        }

        const timestamp = new Date().toISOString();

        // If this is a new chat, generate a new ID
        if (!this.currentConversationId) {
            this.currentConversationId = Date.now().toString();
        }

        const chat = {
            id: this.currentConversationId,
            title: chatTitle,
            timestamp: timestamp,  // Always update timestamp to current time
            messages: chatMessages
        };

        // Check if this conversation already exists
        const existingIndex = savedChats.findIndex(c => c.id === this.currentConversationId);

        if (existingIndex !== -1) {
            // Replace existing chat
            savedChats[existingIndex] = chat;
        } else {
            // Add new chat
            savedChats.push(chat);
        }

        // Store in localStorage
        localStorage.setItem('geminiChats', JSON.stringify(savedChats));
    }

    // Load saved chats into history panel
    loadSavedChats() {
        const historyList = document.querySelector('#history-list');
        historyList.innerHTML = ''; // Clear current list

        const savedChats = JSON.parse(localStorage.getItem('geminiChats') || '[]');

        if (savedChats.length === 0) {
            historyList.innerHTML = '<div class="no-history">No saved chats</div>';
            return;
        }

        // Sort by timestamp (newest first)
        savedChats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Create chat items
        savedChats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = 'history-item';

            const chatDate = new Date(chat.timestamp).toLocaleString();

            chatItem.innerHTML = `
                <div class="history-item-title">${chat.title}</div>
                <div class="history-item-date">${chatDate}</div>
                <div class="history-item-actions">
                    <button class="history-load" data-id="${chat.id}">LOAD</button>
                    <button class="history-delete" data-id="${chat.id}">DELETE</button>
                </div>
            `;

            historyList.appendChild(chatItem);
        });

        // Add event listeners
        document.querySelectorAll('.history-load').forEach(button => {
            button.addEventListener('click', (e) => {
                const chatId = e.target.getAttribute('data-id');
                this.loadChat(chatId);
            });
        });

        document.querySelectorAll('.history-delete').forEach(button => {
            button.addEventListener('click', (e) => {
                const chatId = e.target.getAttribute('data-id');
                this.deleteChat(chatId);
            });
        });
    }

    // Load a specific chat
    loadChat(chatId) {
        const savedChats = JSON.parse(localStorage.getItem('geminiChats') || '[]');
        const chat = savedChats.find(c => c.id === chatId);
        
        if (!chat) return;
        
        // Set current conversation ID to the loaded chat ID
        this.currentConversationId = chatId;
        
        // Clear current chat
        this.chatOutput.innerHTML = '';
        
        // Load messages with isFromHistory flag set to true
        chat.messages.forEach(msg => {
            this.addMessage(msg.role, msg.content, true);
        });
        
        // Update API history if available
        if (window.geminiAPI && typeof window.geminiAPI.loadChatHistory === 'function') {
            window.geminiAPI.loadChatHistory(chat.messages);
        }
        
        // Close history panel
        document.querySelector('#history-panel').style.display = 'none';
    }

    // Delete a saved chat
    deleteChat(chatId) {
        let savedChats = JSON.parse(localStorage.getItem('geminiChats') || '[]');
        savedChats = savedChats.filter(chat => chat.id !== chatId);
        localStorage.setItem('geminiChats', JSON.stringify(savedChats));

        // Refresh the list
        this.loadSavedChats();
    }

    // Implement delete all chats functionality
    deleteAllChats() {
        // Ask for confirmation
        const confirmation = confirm("WARNING: This will permanently delete ALL chat history. Continue?");

        if (confirmation) {
            // Clear local storage
            localStorage.removeItem('geminiChats');

            // Update status
            document.getElementById('status-message').textContent = "ALL HISTORY DELETED";
            setTimeout(() => {
                document.getElementById('status-message').textContent = "READY";
            }, 2000);

            // Refresh the history list (which will show "No saved chats")
            this.loadSavedChats();
        }
    }

  

    // Update startNewChat to save current conversation first


    startNewChat() {
        // Save current chat before starting new one
        this.saveCurrentChat();

        // Clear conversation history in the API object
        if (window.geminiAPI) {
            window.geminiAPI.clearHistory();
        }

        // Generate new conversation ID
        this.currentConversationId = Date.now().toString();

        // Clear chat
        this.chatOutput.innerHTML = '';

        // Get time context
        const timeSinceLastChat = this.getTimeSinceLastConversation();
        const currentDateTime = new Date().toLocaleString();

        // Create welcome message with time info and use current persona name
        let welcomeMessage = `Hello! I'm ${CONFIG.BOT_NAME}. I'm here to assist you.`;

        if (timeSinceLastChat) {
            welcomeMessage += ` `;
        }

        welcomeMessage += " How can I assist you today?";

        // Add welcome message with cursor
        this.addMessage('bot', welcomeMessage);

        // Save this as the last conversation time
        this.saveLastConversationTimestamp();

        // Reset input field
        this.userInput.value = '';
        this.userInput.focus();

        // Close history panel if open
        const historyPanel = document.querySelector('#history-panel');
        if (historyPanel && historyPanel.style.display !== 'none') {
            historyPanel.style.display = 'none';
        }
    }

    initializeFileUpload() {
        const fileInput = document.getElementById('file-upload');
        const previewContainer = document.getElementById('file-preview-container');

        // Handle file selection
        fileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                // Show the preview container if it's not already visible
                if (previewContainer.style.display !== 'flex') {
                    previewContainer.style.display = 'flex';
                    // Clear any previous previews when adding new files
                    previewContainer.innerHTML = '';
                    this.attachedFiles = []; // Clear the array too
                }

                // Process each file
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];

                    // Check file size (e.g., 20MB limit)
                    if (file.size > 20 * 1024 * 1024) {
                        this.addMessage('error', `File "${file.name}" is too large (max 20MB).`);
                        continue; // Skip this file
                    }

                    // Add to attached files array
                    this.attachedFiles.push(file);

                    // Create preview element
                    const preview = document.createElement('div');
                    preview.className = 'file-preview';
                    preview.dataset.fileName = file.name; // Store filename for removal

                    // Create remove button
                    const removeButton = document.createElement('span');
                    removeButton.className = 'file-preview-remove';
                    removeButton.innerHTML = '&times;'; // 'x' symbol
                    removeButton.title = 'Remove file';
                    removeButton.onclick = () => this.removePreview(file.name);

                    // Set preview content (filename + remove button)
                    preview.textContent = file.name; // Show filename
                    preview.appendChild(removeButton); // Add remove button

                    // Append preview to container
                    previewContainer.appendChild(preview);
                }
            }

            // Reset input so the same file can be selected again if needed
            fileInput.value = '';
        });
    }

    // NEW or UPDATED: Function to remove a file preview
    removePreview(fileNameToRemove) {
        const previewContainer = document.getElementById('file-preview-container');

        // Remove file from the attachedFiles array
        this.attachedFiles = this.attachedFiles.filter(file => file.name !== fileNameToRemove);

        // Remove the preview element from the DOM
        const previewElement = previewContainer.querySelector(`.file-preview[data-file-name="${fileNameToRemove}"]`);
        if (previewElement) {
            previewContainer.removeChild(previewElement);
        }

        // Hide the container if no previews are left
        if (previewContainer.children.length === 0) {
            previewContainer.style.display = 'none';
        }
    }

    // NEW: Initialize Settings Panel
    initializeSettingsPanel() {
        const settingsPanel = document.createElement('div');
        settingsPanel.id = 'settings-panel';
        settingsPanel.className = 'side-panel settings-panel'; // Added common class
        settingsPanel.style.display = 'none';

        const settingsHeader = document.createElement('div');
        settingsHeader.className = 'panel-header'; // Common class
        settingsHeader.innerHTML = '<span>SETTINGS</span><button class="close-panel-button" data-panel="settings-panel">X</button>';

        const settingsContent = document.createElement('div');
        settingsContent.id = 'settings-content';
        settingsContent.className = 'panel-content settings-content'; // Common class

        // Add settings fields
        settingsContent.innerHTML = `
            <div class="settings-tabs">
                <div class="settings-tab active" data-tab="general-settings">GENERAL</div>
                <div class="settings-tab" data-tab="personas-settings">PERSONAS</div>
                <div class="settings-tab" data-tab="api-keys-settings">API KEYS</div>
            </div>
            
            <div id="general-settings" class="settings-tab-content active">
                <div class="setting-item">
                    <label for="setting-temperature">Temperature:</label>
                    <input type="number" id="setting-temperature" step="0.1" min="0" max="2.0">
                </div>
                <div class="setting-item">
                    <label for="setting-top-k">Top K:</label>
                    <input type="number" id="setting-top-k" step="1" min="1">
                </div>
                <div class="setting-item">
                    <label for="setting-top-p">Top P:</label>
                    <input type="number" id="setting-top-p" step="0.05" min="0" max="1">
                </div>
                <div class="setting-item">
                    <label for="setting-model">Model:</label>
                    <input type="text" id="setting-model">
                </div>
            </div>
            
            <div id="personas-settings" class="settings-tab-content">
                <div id="personas-list" class="personas-list">
                    <!-- Personas will be added here dynamically -->
                </div>
                
                <button id="add-persona-button" class="terminal-button add-persona-button">ADD NEW PERSONA</button>
                
                <div class="persona-form">
                    <form id="persona-form">
                        <input type="hidden" id="persona-id">
                        <div class="setting-item">
                            <label for="persona-name">Persona Name:</label>
                            <input type="text" id="persona-name" placeholder="Enter name">
                        </div>
                        <div class="setting-item">
                            <label for="persona-prompt">System Prompt:</label>
                            <textarea id="persona-prompt" rows="8" placeholder="Enter system prompt for this persona"></textarea>
                        </div>
                        <div class="form-buttons">
                            <button type="button" id="save-persona-button" class="terminal-button">SAVE</button>
                            <button type="button" id="cancel-persona-button" class="terminal-button">CANCEL</button>
                        </div>
                    </form>
                </div>
            </div>
            
            <div id="api-keys-settings" class="settings-tab-content">
                <div id="api-keys-list" class="api-keys-list">
                    <!-- API keys will be added here dynamically -->
                </div>
                
                <button id="add-api-key-button" class="terminal-button add-api-key-button">ADD NEW API KEY</button>
                
                <div class="api-key-form">
                    <form id="api-key-form">
                        <input type="hidden" id="api-key-id">
                        <div class="setting-item">
                            <label for="api-key-name">API Key Name:</label>
                            <input type="text" id="api-key-name" placeholder="e.g. My Personal Key">
                        </div>
                        <div class="setting-item">
                            <label for="api-key-value">API Key:</label>
                            <input type="password" id="api-key-value" placeholder="Enter your Gemini API key">
                        </div>
                        <div class="form-buttons">
                            <button type="button" id="save-api-key-button" class="terminal-button">SAVE</button>
                            <button type="button" id="cancel-api-key-button" class="terminal-button">CANCEL</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'panel-buttons settings-buttons-container'; // Common class

        const saveButton = document.createElement('button');
        saveButton.id = 'save-settings-button';
        saveButton.className = 'terminal-button';
        saveButton.textContent = 'SAVE SETTINGS';
        saveButton.onclick = () => this.saveSettings();

        buttonsContainer.appendChild(saveButton);

        settingsPanel.appendChild(settingsHeader);
        settingsPanel.appendChild(settingsContent);
        settingsPanel.appendChild(buttonsContainer);

        document.querySelector('#crt-container').appendChild(settingsPanel);

        // Add close button listener
         settingsHeader.querySelector('.close-panel-button').addEventListener('click', (e) => {
            this.toggleSettingsPanel(); // Use the toggle function
        });

        // Add listeners for persona management
        this.initializePersonaManagement();
        
        // Add listeners for persona buttons
        document.getElementById('add-persona-button').addEventListener('click', () => {
            this.createNewPersona();
        });
        
        document.getElementById('save-persona-button').addEventListener('click', (e) => {
            e.preventDefault();
            this.savePersonaForm();
        });
        
        document.getElementById('cancel-persona-button').addEventListener('click', (e) => {
            e.preventDefault();
            this.cancelPersonaForm();
        });

        this.initializeApiKeyManagement();

        // Add listeners for API key buttons
        document.getElementById('add-api-key-button').addEventListener('click', () => {
            this.createNewApiKey();
        });

        document.getElementById('save-api-key-button').addEventListener('click', (e) => {
            e.preventDefault();
            this.saveApiKeyForm();
        });

        document.getElementById('cancel-api-key-button').addEventListener('click', (e) => {
            e.preventDefault();
            this.cancelApiKeyForm();
        });
    }

    // NEW: Toggle Settings Panel
    toggleSettingsPanel() {
        const panel = document.querySelector('#settings-panel');
        const historyPanel = document.querySelector('#history-panel');
        if (panel.style.display === 'none') {
            // Hide history panel if open
            if (historyPanel.style.display !== 'none') {
                historyPanel.style.display = 'none';
            }
            // Populate with current settings
            document.getElementById('setting-temperature').value = CONFIG.TEMPERATURE || 1.0;
            document.getElementById('setting-top-k').value = CONFIG.TOP_K || 40;
            document.getElementById('setting-top-p').value = CONFIG.TOP_P || 0.95;
            document.getElementById('setting-model').value = CONFIG.MODEL || 'gemini-1.5-flash';
            
            // Display personas
            this.displayPersonas();
            
            panel.style.display = 'flex';
        } else {
            panel.style.display = 'none';
        }
    }

    // NEW: Save Settings
    saveSettings() {
        try {
            const newTemp = parseFloat(document.getElementById('setting-temperature').value);
            const newTopK = parseInt(document.getElementById('setting-top-k').value, 10);
            const newTopP = parseFloat(document.getElementById('setting-top-p').value);
            const newModel = document.getElementById('setting-model').value.trim();

            // Basic validation
            if (isNaN(newTemp) || newTemp < 0 || newTemp > 2.0) {
                alert("Invalid Temperature value. Must be between 0.0 and 2.0.");
                return;
            }
            if (isNaN(newTopK) || newTopK < 1) {
                alert("Invalid Top K value. Must be 1 or greater.");
                return;
            }
            if (isNaN(newTopP) || newTopP < 0 || newTopP > 1.0) {
                alert("Invalid Top P value. Must be between 0.0 and 1.0.");
                return;
            }
            if (!newModel) {
                alert("Model name cannot be empty.");
                return;
            }

            // Update the global CONFIG object
            CONFIG.TEMPERATURE = newTemp;
            CONFIG.TOP_K = newTopK;
            CONFIG.TOP_P = newTopP;
            CONFIG.MODEL = newModel;

            // Save to localStorage
            if (typeof saveConfigToStorage === 'function') {
                saveConfigToStorage();
            } else {
                localStorage.setItem('geminiConfig', JSON.stringify(CONFIG));
            }

            // Optionally: Notify the API handler if it needs explicit updates
            if (window.geminiAPI && typeof window.geminiAPI.updateSettings === 'function') {
                window.geminiAPI.updateSettings(CONFIG);
                console.log("Gemini API settings updated.");
            } else {
                console.log("Global CONFIG updated. API will use new settings on next call.");
            }

            document.getElementById('status-message').textContent = "SETTINGS SAVED";
            setTimeout(() => {
                document.getElementById('status-message').textContent = "READY";
            }, 2000);

            this.toggleSettingsPanel(); // Close panel after saving

        } catch (error) {
            console.error("Error saving settings:", error);
            this.addMessage('error', 'Failed to save settings. Check console.');
            document.getElementById('status-message').textContent = "SAVE FAILED";
        }
    }

    // Add this to the RetroTerminal class

    // Add this after the initializeSettingsPanel() method
    initializePersonaManagement() {
        // Ensure we have the default persona in storage
        this.loadPersonas();
        
        // Add event listeners for switching tabs in settings panel
        document.addEventListener('click', e => {
            if (e.target.classList.contains('settings-tab')) {
                // Get all tabs and content, remove active class
                const tabs = document.querySelectorAll('.settings-tab');
                const tabContents = document.querySelectorAll('.settings-tab-content');
                
                tabs.forEach(tab => tab.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                e.target.classList.add('active');
                const tabId = e.target.dataset.tab;
                document.getElementById(tabId).classList.add('active');
            }
        });
    }

    // Load personas from storage
    loadPersonas() {
        let personas = JSON.parse(localStorage.getItem('geminiPersonas') || '[]');
        
        // If no personas stored, initialize with default Syntra persona
        if (personas.length === 0) {
            const defaultPersona = {
                id: 'default',
                name: CONFIG.BOT_NAME || 'Syntra',
                systemPrompt: CONFIG.SYSTEM_PROMPT || '',
                default: true,
                active: true
            };
            personas = [defaultPersona];
            localStorage.setItem('geminiPersonas', JSON.stringify(personas));
        }
        
        return personas;
    }

    // Save personas to storage
    savePersonas(personas) {
        localStorage.setItem('geminiPersonas', JSON.stringify(personas));
    }

    // Display personas in settings panel
    displayPersonas() {
        const personas = this.loadPersonas();
        const personasList = document.getElementById('personas-list');
        
        if (!personasList) return;
        
        personasList.innerHTML = '';
        
        personas.forEach(persona => {
            const personaItem = document.createElement('div');
            personaItem.className = `persona-item ${persona.active ? 'active' : ''}`;
            
            const description = persona.systemPrompt.length > 50 
                ? persona.systemPrompt.substring(0, 50) + '...' 
                : persona.systemPrompt;
            
            personaItem.innerHTML = `
                <div class="persona-name">${persona.name}</div>
                <div class="persona-description">${description}</div>
                <div class="persona-actions">
                    <button class="persona-button select-persona" data-id="${persona.id}">SELECT</button>
                    <button class="persona-button edit-persona" data-id="${persona.id}">EDIT</button>
                    ${!persona.default ? `<button class="persona-button delete-persona" data-id="${persona.id}">DELETE</button>` : ''}
                </div>
            `;
            
            personasList.appendChild(personaItem);
        });
        
        // Add event listeners
        document.querySelectorAll('.select-persona').forEach(button => {
            button.addEventListener('click', e => {
                const personaId = e.target.dataset.id;
                this.activatePersona(personaId);
            });
        });
        
        document.querySelectorAll('.edit-persona').forEach(button => {
            button.addEventListener('click', e => {
                const personaId = e.target.dataset.id;
                this.editPersona(personaId);
            });
        });
        
        document.querySelectorAll('.delete-persona').forEach(button => {
            button.addEventListener('click', e => {
                const personaId = e.target.dataset.id;
                this.deletePersona(personaId);
            });
        });
    }

    // Activate a persona
    activatePersona(personaId) {
        const personas = this.loadPersonas();
        
        // Update active state
        personas.forEach(persona => {
            persona.active = (persona.id === personaId);
            
            // If this is the new active persona, update CONFIG
            if (persona.active) {
                CONFIG.BOT_NAME = persona.name;
                CONFIG.SYSTEM_PROMPT = persona.systemPrompt;
                
                // Update API settings if available
                if (window.geminiAPI && typeof window.geminiAPI.updateSettings === 'function') {
                    window.geminiAPI.updateSettings(CONFIG);
                    console.log(`Persona switched to: ${persona.name}`);
                }
            }
        });
        
        // Save updated personas
        this.savePersonas(personas);
        
        // Update display
        this.displayPersonas();
        
        // Show confirmation
        document.getElementById('status-message').textContent = `PERSONA: ${CONFIG.BOT_NAME}`;
        setTimeout(() => {
            document.getElementById('status-message').textContent = "READY";
        }, 2000);
    }

    // Edit a persona
    editPersona(personaId) {
        const personas = this.loadPersonas();
        const persona = personas.find(p => p.id === personaId);
        
        if (!persona) return;
        
        // Populate form
        document.getElementById('persona-id').value = persona.id;
        document.getElementById('persona-name').value = persona.name;
        document.getElementById('persona-prompt').value = persona.systemPrompt;
        
        // Show form
        document.querySelector('.persona-form').classList.add('visible');
        
        // Scroll to form
        document.querySelector('.persona-form').scrollIntoView({ behavior: 'smooth' });
    }

    // Delete a persona
    deletePersona(personaId) {
        // Ask for confirmation
        const confirmation = confirm("Are you sure you want to delete this persona?");
        if (!confirmation) return;
        
        let personas = this.loadPersonas();
        
        // Check if trying to delete active persona
        const activePersona = personas.find(p => p.id === personaId && p.active);
        
        if (activePersona) {
            alert("Cannot delete the currently active persona. Please select another persona first.");
            return;
        }
        
        // Remove the persona
        personas = personas.filter(p => p.id !== personaId);
        
        // Save updated personas
        this.savePersonas(personas);
        
        // Update display
        this.displayPersonas();
        
        // Show confirmation
        document.getElementById('status-message').textContent = "PERSONA DELETED";
        setTimeout(() => {
            document.getElementById('status-message').textContent = "READY";
        }, 2000);
    }

    // Save persona from form
    savePersonaForm() {
        const personaId = document.getElementById('persona-id').value;
        const name = document.getElementById('persona-name').value.trim();
        const systemPrompt = document.getElementById('persona-prompt').value.trim();
        
        // Validate
        if (!name) {
            alert("Persona name cannot be empty.");
            return;
        }
        
        const personas = this.loadPersonas();
        
        if (personaId) {
            // Edit existing persona
            const personaIndex = personas.findIndex(p => p.id === personaId);
            
            if (personaIndex !== -1) {
                // Update persona
                personas[personaIndex].name = name;
                personas[personaIndex].systemPrompt = systemPrompt;
                
                // Update CONFIG if this is the active persona
                if (personas[personaIndex].active) {
                    CONFIG.BOT_NAME = name;
                    CONFIG.SYSTEM_PROMPT = systemPrompt;
                    saveConfigToStorage();
                    
                    // Update API settings if available
                    if (window.geminiAPI && typeof window.geminiAPI.updateSettings === 'function') {
                        window.geminiAPI.updateSettings(CONFIG);
                    }
                }
            }
        } else {
            // Create new persona
            const newPersona = {
                id: Date.now().toString(),
                name: name,
                systemPrompt: systemPrompt,
                default: false,
                active: false
            };
            
            personas.push(newPersona);
        }
        
        // Save updated personas
        this.savePersonas(personas);
        
        // Hide form and reset
        document.querySelector('.persona-form').classList.remove('visible');
        document.getElementById('persona-form').reset();
        document.getElementById('persona-id').value = '';
        
        // Update display
        this.displayPersonas();
        
        // Show confirmation
        document.getElementById('status-message').textContent = "PERSONA SAVED";
        setTimeout(() => {
            document.getElementById('status-message').textContent = "READY";
        }, 2000);
    }

    // Create a new persona
    createNewPersona() {
        // Reset form
        document.getElementById('persona-form').reset();
        document.getElementById('persona-id').value = '';
        
        // Show form
        document.querySelector('.persona-form').classList.add('visible');
        
        // Scroll to form
        document.querySelector('.persona-form').scrollIntoView({ behavior: 'smooth' });
    }

    // Cancel form edit
    cancelPersonaForm() {
        document.querySelector('.persona-form').classList.remove('visible');
        document.getElementById('persona-form').reset();
        document.getElementById('persona-id').value = '';
    }

    // Add this helper method to remove all cursors from the chat
    removeCursors() {
        const cursors = this.chatOutput.querySelectorAll('.typing-cursor');
        cursors.forEach(cursor => {
            if (cursor.parentNode) {
                cursor.parentNode.removeChild(cursor);
            }
        });
    }

    // NEW: Initialize API Key Management
    initializeApiKeyManagement() {
        // Ensure we have the default API keys in storage
        this.loadApiKeys();
        
        // Add event listeners for switching tabs in settings panel
        document.addEventListener('click', e => {
            if (e.target.classList.contains('settings-tab')) {
                // Get all tabs and content, remove active class
                const tabs = document.querySelectorAll('.settings-tab');
                const tabContents = document.querySelectorAll('.settings-tab-content');
                
                tabs.forEach(tab => tab.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                e.target.classList.add('active');
                const tabId = e.target.dataset.tab;
                document.getElementById(tabId).classList.add('active');
            }
        });
    }

    // Load API keys from storage
    loadApiKeys() {
        let apiKeys = JSON.parse(localStorage.getItem('geminiApiKeys') || '[]');
        
        return apiKeys;
    }

    // Save API keys to storage
    saveApiKeys(apiKeys) {
        localStorage.setItem('geminiApiKeys', JSON.stringify(apiKeys));
    }

    // Display API keys in settings panel
    displayApiKeys() {
        const apiKeys = this.loadApiKeys();
        const apiKeysList = document.getElementById('api-keys-list');
        
        if (!apiKeysList) return;
        
        apiKeysList.innerHTML = '';
        
        apiKeys.forEach(apiKey => {
            const apiKeyItem = document.createElement('div');
            apiKeyItem.className = `api-key-item`;
            
            apiKeyItem.innerHTML = `
                <div class="api-key-name">${apiKey.name}</div>
                <div class="api-key-actions">
                    <button class="api-key-button edit-api-key" data-id="${apiKey.id}">EDIT</button>
                    <button class="api-key-button delete-api-key" data-id="${apiKey.id}">DELETE</button>
                </div>
            `;
            
            apiKeysList.appendChild(apiKeyItem);
        });
        
        // Add event listeners
        document.querySelectorAll('.edit-api-key').forEach(button => {
            button.addEventListener('click', e => {
                const apiKeyId = e.target.dataset.id;
                this.editApiKey(apiKeyId);
            });
        });
        
        document.querySelectorAll('.delete-api-key').forEach(button => {
            button.addEventListener('click', e => {
                const apiKeyId = e.target.dataset.id;
                this.deleteApiKey(apiKeyId);
            });
        });
    }

    // Edit an API key
    editApiKey(apiKeyId) {
        const apiKeys = this.loadApiKeys();
        const apiKey = apiKeys.find(k => k.id === apiKeyId);
        
        if (!apiKey) return;
        
        // Populate form
        document.getElementById('api-key-id').value = apiKey.id;
        document.getElementById('api-key-name').value = apiKey.name;
        document.getElementById('api-key-value').value = apiKey.value;
        
        // Show form
        document.querySelector('.api-key-form').classList.add('visible');
        
        // Scroll to form
        document.querySelector('.api-key-form').scrollIntoView({ behavior: 'smooth' });
    }

    // Delete an API key
    deleteApiKey(apiKeyId) {
        // Ask for confirmation
        const confirmation = confirm("Are you sure you want to delete this API key?");
        if (!confirmation) return;
        
        let apiKeys = this.loadApiKeys();
        
        // Remove the API key
        apiKeys = apiKeys.filter(k => k.id !== apiKeyId);
        
        // Save updated API keys
        this.saveApiKeys(apiKeys);
        
        // Update display
        this.displayApiKeys();
        
        // Show confirmation
        document.getElementById('status-message').textContent = "API KEY DELETED";
        setTimeout(() => {
            document.getElementById('status-message').textContent = "READY";
        }, 2000);
    }

    // Save API key from form
    saveApiKeyForm() {
        const apiKeyId = document.getElementById('api-key-id').value;
        const name = document.getElementById('api-key-name').value.trim();
        const value = document.getElementById('api-key-value').value.trim();
        
        // Validate
        if (!name) {
            alert("API key name cannot be empty.");
            return;
        }
        if (!value) {
            alert("API key value cannot be empty.");
            return;
        }
        
        const apiKeys = this.loadApiKeys();
        
        if (apiKeyId) {
            // Edit existing API key
            const apiKeyIndex = apiKeys.findIndex(k => k.id === apiKeyId);
            
            if (apiKeyIndex !== -1) {
                // Update API key
                apiKeys[apiKeyIndex].name = name;
                apiKeys[apiKeyIndex].value = value;
            }
        } else {
            // Create new API key
            const newApiKey = {
                id: Date.now().toString(),
                name: name,
                value: value
            };
            
            apiKeys.push(newApiKey);
        }
        
        // Save updated API keys
        this.saveApiKeys(apiKeys);
        
        // Hide form and reset
        document.querySelector('.api-key-form').classList.remove('visible');
        document.getElementById('api-key-form').reset();
        document.getElementById('api-key-id').value = '';
        
        // Update display
        this.displayApiKeys();
        
        // Show confirmation
        document.getElementById('status-message').textContent = "API KEY SAVED";
        setTimeout(() => {
            document.getElementById('status-message').textContent = "READY";
        }, 2000);
    }

    // Create a new API key
    createNewApiKey() {
        // Reset form
        document.getElementById('api-key-form').reset();
        document.getElementById('api-key-id').value = '';
        
        // Show form
        document.querySelector('.api-key-form').classList.add('visible');
        
        // Scroll to form
        document.querySelector('.api-key-form').scrollIntoView({ behavior: 'smooth' });
    }

    // Cancel form edit
    cancelApiKeyForm() {
        document.querySelector('.api-key-form').classList.remove('visible');
        document.getElementById('api-key-form').reset();
        document.getElementById('api-key-id').value = '';
    }

    // Add these methods to the RetroTerminal class

    // Initialize API key management
    initializeApiKeyManagement() {
        // Ensure we have at least one API key in storage
        this.loadApiKeys();
        
        // Display API keys
        this.displayApiKeys();
    }

    // Load API keys from storage
    loadApiKeys() {
        let apiKeys = JSON.parse(localStorage.getItem('geminiApiKeys') || '[]');
        
        // If no API keys stored, initialize with current key if it exists
        if (apiKeys.length === 0 && CONFIG.API_KEY) {
            const defaultKey = {
                id: 'default',
                name: 'Default Key',
                value: CONFIG.API_KEY,
                active: true
            };
            apiKeys = [defaultKey];
            localStorage.setItem('geminiApiKeys', JSON.stringify(apiKeys));
        }
        
        return apiKeys;
    }

    // Save API keys to storage
    saveApiKeys(apiKeys) {
        localStorage.setItem('geminiApiKeys', JSON.stringify(apiKeys));
    }

    // Display API keys in settings panel
    displayApiKeys() {
        const apiKeys = this.loadApiKeys();
        const apiKeysList = document.getElementById('api-keys-list');
        
        if (!apiKeysList) return;
        
        apiKeysList.innerHTML = '';
        
        if (apiKeys.length === 0) {
            apiKeysList.innerHTML = '<div class="no-api-keys">No API keys saved. Add one to get started.</div>';
            return;
        }
        
        apiKeys.forEach(apiKey => {
            const apiKeyItem = document.createElement('div');
            apiKeyItem.className = `api-key-item ${apiKey.active ? 'active' : ''}`;
            
            // Mask the API key for display
            const maskedKey = apiKey.value ? '••••••••' + apiKey.value.substring(apiKey.value.length - 4) : '••••••••';
            
            apiKeyItem.innerHTML = `
                <div class="api-key-name">${apiKey.name}</div>
                <div class="api-key-value">${maskedKey}</div>
                <div class="api-key-actions">
                    <button class="api-key-button select-api-key" data-id="${apiKey.id}">SELECT</button>
                    <button class="api-key-button edit-api-key" data-id="${apiKey.id}">EDIT</button>
                    <button class="api-key-button delete-api-key" data-id="${apiKey.id}">DELETE</button>
                </div>
            `;
            
            apiKeysList.appendChild(apiKeyItem);
        });
        
        // Add event listeners
        document.querySelectorAll('.select-api-key').forEach(button => {
            button.addEventListener('click', e => {
                const apiKeyId = e.target.dataset.id;
                this.activateApiKey(apiKeyId);
            });
        });
        
        document.querySelectorAll('.edit-api-key').forEach(button => {
            button.addEventListener('click', e => {
                const apiKeyId = e.target.dataset.id;
                this.editApiKey(apiKeyId);
            });
        });
        
        document.querySelectorAll('.delete-api-key').forEach(button => {
            button.addEventListener('click', e => {
                const apiKeyId = e.target.dataset.id;
                this.deleteApiKey(apiKeyId);
            });
        });
    }

    // Activate an API key
    activateApiKey(apiKeyId) {
        const apiKeys = this.loadApiKeys();
        
        // Update active state
        apiKeys.forEach(apiKey => {
            apiKey.active = (apiKey.id === apiKeyId);
            
            // If this is the new active API key, update CONFIG
            if (apiKey.active) {
                CONFIG.API_KEY = apiKey.value;
                
                // Update API instance if available
                if (window.geminiAPI && typeof window.geminiAPI.updateApiKey === 'function') {
                    window.geminiAPI.updateApiKey(apiKey.value);
                    console.log(`API key switched to: ${apiKey.name}`);
                } else if (window.geminiAPI) {
                    // If updateApiKey doesn't exist but API does,
                    // we need to reinitialize with the new key
                    window.initGeminiAPI(apiKey.value);
                    console.log(`API reinitialized with key: ${apiKey.name}`);
                }
            }
        });
        
        // Save updated API keys
        this.saveApiKeys(apiKeys);
        
        // Update display
        this.displayApiKeys();
        
        // Show confirmation
        document.getElementById('status-message').textContent = `API KEY: ${apiKeys.find(k => k.active).name}`;
        setTimeout(() => {
            document.getElementById('status-message').textContent = "READY";
        }, 2000);
    }

    // Edit an API key
    editApiKey(apiKeyId) {
        const apiKeys = this.loadApiKeys();
        const apiKey = apiKeys.find(k => k.id === apiKeyId);
        
        if (!apiKey) return;
        
        // Populate form
        document.getElementById('api-key-id').value = apiKey.id;
        document.getElementById('api-key-name').value = apiKey.name;
        document.getElementById('api-key-value').value = apiKey.value;
        
        // Show form
        document.querySelector('.api-key-form').classList.add('visible');
        
        // Scroll to form
        document.querySelector('.api-key-form').scrollIntoView({ behavior: 'smooth' });
    }

    // Delete an API key
    deleteApiKey(apiKeyId) {
        const apiKeys = this.loadApiKeys();
        
        // Check if trying to delete active API key
        const isActiveKey = apiKeys.find(k => k.id === apiKeyId && k.active);
        
        if (isActiveKey && apiKeys.length > 1) {
            alert("Cannot delete the currently active API key. Please select another key first.");
            return;
        }
        
        // Confirm deletion
        const confirmation = confirm("Are you sure you want to delete this API key?");
        if (!confirmation) return;
        
        // Remove the API key
        const updatedKeys = apiKeys.filter(k => k.id !== apiKeyId);
        
        // If we deleted the last key
        if (updatedKeys.length === 0) {
            CONFIG.API_KEY = "";
            document.getElementById('status-message').textContent = "NO API KEY";
        } 
        // If we deleted the active key and there are others, activate the first one
        else if (isActiveKey) {
            updatedKeys[0].active = true;
            CONFIG.API_KEY = updatedKeys[0].value;
            
            // Update API
            if (window.geminiAPI && typeof window.geminiAPI.updateApiKey === 'function') {
                window.geminiAPI.updateApiKey(updatedKeys[0].value);
            } else if (window.geminiAPI) {
                window.initGeminiAPI(updatedKeys[0].value);
            }
        }
        
        // Save updated API keys
        this.saveApiKeys(updatedKeys);
        
        // Update display
        this.displayApiKeys();
        
        // Show confirmation
        document.getElementById('status-message').textContent = "API KEY DELETED";
        setTimeout(() => {
            document.getElementById('status-message').textContent = "READY";
        }, 2000);
    }

    // Save API key from form
    saveApiKeyForm() {
        const apiKeyId = document.getElementById('api-key-id').value;
        const name = document.getElementById('api-key-name').value.trim();
        const value = document.getElementById('api-key-value').value.trim();
        
        // Validate
        if (!name) {
            alert("API key name cannot be empty.");
            return;
        }
        
        if (!value) {
            alert("API key value cannot be empty.");
            return;
        }
        
        const apiKeys = this.loadApiKeys();
        
        if (apiKeyId) {
            // Edit existing API key
            const keyIndex = apiKeys.findIndex(k => k.id === apiKeyId);
            
            if (keyIndex !== -1) {
                // Update API key
                apiKeys[keyIndex].name = name;
                apiKeys[keyIndex].value = value;
                
                // Update CONFIG if this is the active API key
                if (apiKeys[keyIndex].active) {
                    CONFIG.API_KEY = value;
                    
                    // Update API
                    if (window.geminiAPI && typeof window.geminiAPI.updateApiKey === 'function') {
                        window.geminiAPI.updateApiKey(value);
                    } else if (window.geminiAPI) {
                        window.initGeminiAPI(value);
                    }
                }
            }
        } else {
            // Create new API key
            const newApiKey = {
                id: Date.now().toString(),
                name: name,
                value: value,
                active: apiKeys.length === 0 // If it's the first key, make it active
            };
            
            // If this is the first key or being set as active
            if (newApiKey.active) {
                // Set all other keys to inactive
                apiKeys.forEach(k => k.active = false);
                
                // Update CONFIG
                CONFIG.API_KEY = value;
                
                // Update API
                if (window.geminiAPI && typeof window.geminiAPI.updateApiKey === 'function') {
                    window.geminiAPI.updateApiKey(value);
                } else if (window.geminiAPI) {
                    window.initGeminiAPI(value);
                }
            }
            
            apiKeys.push(newApiKey);
        }
        
        // Save updated API keys
        this.saveApiKeys(apiKeys);
        
        // Hide form and reset
        document.querySelector('.api-key-form').classList.remove('visible');
        document.getElementById('api-key-form').reset();
        document.getElementById('api-key-id').value = '';
        
        // Update display
        this.displayApiKeys();
        
        // Show confirmation
        document.getElementById('status-message').textContent = "API KEY SAVED";
        setTimeout(() => {
            document.getElementById('status-message').textContent = "READY";
        }, 2000);
    }

    // Create a new API key
    createNewApiKey() {
        // Reset form
        document.getElementById('api-key-form').reset();
        document.getElementById('api-key-id').value = '';
        
        // Show form
        document.querySelector('.api-key-form').classList.add('visible');
        
        // Scroll to form
        document.querySelector('.api-key-form').scrollIntoView({ behavior: 'smooth' });
    }

    // Cancel form edit
    cancelApiKeyForm() {
        document.querySelector('.api-key-form').classList.remove('visible');
        document.getElementById('api-key-form').reset();
        document.getElementById('api-key-id').value = '';
    }
}