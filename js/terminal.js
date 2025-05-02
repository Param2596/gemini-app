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

        // Add custom rules for terminal-specific elements
        this.md.use((remarkable) => {
            const defaultRender = remarkable.renderer.code;
            remarkable.renderer.code = function (code, lang) {
                // Add copy button container
                const html = defaultRender.call(remarkable.renderer, code, lang);
                return `<div class="code-block-container">${html}</div>`;
            };
        });

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
        newChatButton.className = 'terminal-button header-button';
        newChatButton.textContent = 'NEW CHAT';
        newChatButton.onclick = () => this.startNewChat();
        controlsDiv.appendChild(newChatButton);

        // Add HISTORY button
        const historyButton = document.createElement('button');
        historyButton.id = 'history-button';
        historyButton.className = 'terminal-button header-button';
        historyButton.textContent = 'HISTORY';
        historyButton.onclick = () => this.toggleHistoryPanel();
        controlsDiv.appendChild(historyButton);

        // Add SETTINGS button
        const settingsButton = document.createElement('button');
        settingsButton.id = 'settings-button';
        settingsButton.className = 'terminal-button header-button';
        settingsButton.textContent = 'SETTINGS';
        settingsButton.onclick = () => this.toggleSettingsPanel();
        controlsDiv.appendChild(settingsButton);

        // Add Theme Selector (keeping existing structure)
        const themeWrapper = document.createElement('div');
        themeWrapper.className = 'select-wrapper';
        themeWrapper.appendChild(this.themeSelector); // Use the existing selector
        controlsDiv.appendChild(themeWrapper);


        // Create initial boot prompt (moved from initializeTerminal)
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
        bootMessageDiv.className = 'message bot-message boot-message';
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
                
                // Add welcome message as a separate message
                setTimeout(() => {
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
    addMessage(type, content) {
        // Remove the separator code from here (we'll add it after typing completes)
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;

        if (type === 'user') {
            messageDiv.textContent = `YOU: ${content}`;
            this.chatOutput.appendChild(messageDiv);
            this.chatOutput.scrollTop = this.chatOutput.scrollHeight;
        } else if (type === 'error') {
            messageDiv.className = 'message error-message';
            messageDiv.textContent = `ERROR: ${content}`;
            this.chatOutput.appendChild(messageDiv);
            this.chatOutput.scrollTop = this.chatOutput.scrollHeight;
        } else {
            // Bot message container
            const messageContentDiv = document.createElement('div');
            messageContentDiv.className = 'message-content';
            messageContentDiv.innerHTML = this.renderMarkdown(content);
            
            // Initialize code blocks
            this.initializeCodeBlock(messageContentDiv);
            
            // Create separator (but don't add it yet)
            const separator = document.createElement('div');
            separator.className = 'message-separator';
            
            // Add message actions
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
            
            // Append content div to message
            messageDiv.appendChild(messageContentDiv);
            
            // Add to chat
            this.chatOutput.appendChild(messageDiv);
            this.chatOutput.scrollTop = this.chatOutput.scrollHeight;
            
            // Start typing animation and add separator + buttons when complete
            this.typeText(messageContentDiv, content).then(() => {
                // Don't add separator for boot/welcome messages
                if (!content.includes('BIOS') && !content.includes('Terminal ready') && 
                    !content.includes('Memory check') && !content.includes('Loading') && 
                    !content.includes('Initializing') && !content.includes('Network connection') &&
                    !content.includes('Kernel loaded')&&
                    !content.includes('Loading language modules') &&
                    !content.includes('Loading creativity engines') &&
                    !content.includes('Loading knowledge base') &&
                    !content.includes('AI ready') &&
                    !content.includes('/OS') &&
                    !content.includes(`Hello! I'm ${CONFIG.BOT_NAME}`)) {
                    
                    // Add separator after content is typed and before action buttons
                    messageDiv.appendChild(separator);
                }
                
                // Add action buttons after separator
                messageDiv.appendChild(actionsDiv);
                
                // Scroll to ensure everything is visible
                this.chatOutput.scrollTop = this.chatOutput.scrollHeight;
            });
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
        // Add copy buttons to code blocks
        html = html.replace(/<div class="code-block-container">/g, 
            '<div class="code-block-container"><button class="copy-button">COPY</button>');

        // Ensure images have proper terminal styling
        html = html.replace(/<img /g, '<img class="rendered-image" ');

        return html;
    }

    // Update initialization of any copy buttons
    initializeCodeBlock(element) {
        const copyButtons = element.querySelectorAll('.copy-button');
        copyButtons.forEach(button => {
            button.addEventListener('click', () => {
                const codeBlock = button.nextElementSibling;
                if (codeBlock) {
                    const code = codeBlock.textContent;
                    this.copyToClipboard(code);
                }
            });
        });
    }

    // Process markdown tables
    processMarkdownTables(text) {
        const tableRegex = /\n((\|[^\n]+\|\n)((?:\|[-:\s]+)+\|\n)((?:\|[^\n]+\|\n)+))/g;
        
        return text.replace(tableRegex, (match, table) => {
            // Split table into rows
            const rows = table.trim().split('\n');
            
            // Process header row
            const headerRow = rows[0];
            const headerCells = headerRow.split('|').slice(1, -1);
            const header = `<tr>${headerCells.map(cell => `<th>${cell.trim()}</th>`).join('')}</tr>`;
            
            const body = bodyRows.map(row => {
                const cells = row.split('|').slice(1, -1);
                return `<tr>${cells.map(cell => `<td>${cell.trim()}</td>`).join('')}</tr>`;
            }).join('');
            
            // Assemble the table
            return `\n<div class="table-container"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>\n`;
        });
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
            // Create display message with file info
            let displayMessage = message;
            if (this.attachedFiles.length > 0) {
                const fileNames = this.attachedFiles.map(file => file.name).join(', ');
                if (displayMessage) displayMessage += '\n\n';
                displayMessage += `[Attached files: ${fileNames}]`;
            }
            
            // Add user message to chat
            this.addMessage('user', displayMessage);
            
            let response;
            
            // If we have files, process them
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
            
            // Add response to chat
            if (response) { // Check if response exists (might not if only files were sent and API doesn't return text)
                 this.addMessage('bot', response);
            }
        } catch (error) {
            console.error('Error sending message:', error);
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
        typeText(element, text, speed = 10, chunkDelay = 200) {
        return new Promise(resolve => {
            // Clear the element first
            element.innerHTML = '';
            
            // Split into chunks while preserving code blocks
            const chunks = [];
            let currentChunk = '';
            let insideCodeBlock = false;
            
            text.split('\n').forEach(line => {
                if (line.startsWith('```')) {
                    if (insideCodeBlock) {
                        // End of code block
                        currentChunk += line + '\n';
                        chunks.push(currentChunk);
                        currentChunk = '';
                        insideCodeBlock = false;
                    } else {
                        // Start of code block
                        if (currentChunk) {
                            chunks.push(currentChunk);
                        }
                        currentChunk = line + '\n';
                        insideCodeBlock = true;
                    }
                } else {
                    currentChunk += line + '\n';
                    if (!insideCodeBlock && line === '') {
                        chunks.push(currentChunk);
                        currentChunk = '';
                    }
                }
            });
            
            // Add any remaining content
            if (currentChunk) {
                chunks.push(currentChunk);
            }
    
            let current = 0;
    
            const typeChunk = () => {
                if (current < chunks.length) {
                    // Get all chunks up to current
                    const partialText = chunks.slice(0, current + 1).join('');
                    // Render markdown for the complete partial text
                    element.innerHTML = this.renderMarkdown(partialText);
                    
                    // Initialize any code blocks in this chunk
                    this.initializeCodeBlock(element);
                    
                    // Scroll to bottom
                    element.parentElement.scrollTop = element.parentElement.scrollHeight;
                    
                    current++;
                    setTimeout(typeChunk, chunkDelay);
                } else {
                    resolve();
                }
            };
    
            typeChunk();
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
        if (this.chatOutput.querySelectorAll('.message').length < 3) return; // Ignore boot messages
        
        const savedChats = JSON.parse(localStorage.getItem('geminiChats') || '[]');
        
        // Create a chat object
        const chatMessages = [];
        const messages = this.chatOutput.querySelectorAll('.message');
        
        let foundRealConversation = false;
        
        messages.forEach(msg => {
            // Skip boot messages entirely
            if (msg.classList.contains('boot-message')) {
                return;
            }
            
            if (msg.classList.contains('user-message')) {
                // This is a user message - add it and mark that we've started the real conversation
                foundRealConversation = true;
                chatMessages.push({
                    role: 'user',
                    content: msg.textContent.replace('YOU: ', '')
                });
            } else if (msg.classList.contains('bot-message')) {
                const content = msg.querySelector('.message-content')?.textContent || msg.textContent;
                
                // Skip welcome message
                if (content.includes(`Hello! I'm ${CONFIG.BOT_NAME}`) || 
                    content.includes("Terminal online") || 
                    content.includes("Awaiting input")) {
                    return;
                }
                
                // If we already found a real user message, or this is a substantive bot response
                // that isn't just the welcome message, include it
                if (foundRealConversation) {
                    chatMessages.push({
                        role: 'bot',
                        content: content
                    });
                }
            }
        });
        
        // Only save if we have actual conversation messages (at least one user message)
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
        
        // Clear current chat
        this.chatOutput.innerHTML = '';
        
        // Load messages
        chat.messages.forEach(msg => {
            this.addMessage(msg.role, msg.content);
        });
        
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
        
        // Add welcome message
        this.addMessage('bot', `Hello! I'm ${CONFIG.BOT_NAME}. How can I assist you today?`);
        
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
            <div class="setting-item">
                <label for="setting-bot-name">Bot Name:</label>
                <input type="text" id="setting-bot-name">
            </div>
            <div class="setting-item">
                <label for="setting-system-prompt">System Prompt:</label>
                <textarea id="setting-system-prompt" rows="8"></textarea>
            </div>
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
            document.getElementById('setting-bot-name').value = CONFIG.BOT_NAME || 'Syntra';
            document.getElementById('setting-system-prompt').value = CONFIG.SYSTEM_PROMPT || '';
            document.getElementById('setting-temperature').value = CONFIG.TEMPERATURE || 1.0;
            document.getElementById('setting-top-k').value = CONFIG.TOP_K || 40;
            document.getElementById('setting-top-p').value = CONFIG.TOP_P || 0.95;
            document.getElementById('setting-model').value = CONFIG.MODEL || 'gemini-1.5-flash'; // Default if not set
            panel.style.display = 'flex';
        } else {
            panel.style.display = 'none';
        }
    }

    // NEW: Save Settings
    saveSettings() {
        try {
            const newBotName = document.getElementById('setting-bot-name').value.trim();
            const newPrompt = document.getElementById('setting-system-prompt').value;
            const newTemp = parseFloat(document.getElementById('setting-temperature').value);
            const newTopK = parseInt(document.getElementById('setting-top-k').value, 10);
            const newTopP = parseFloat(document.getElementById('setting-top-p').value);
            const newModel = document.getElementById('setting-model').value.trim();

            // Basic validation
            if (!newBotName) {
                alert("Bot name cannot be empty.");
                return;
            }
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
            CONFIG.BOT_NAME = newBotName;
            CONFIG.SYSTEM_PROMPT = newPrompt;
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
}