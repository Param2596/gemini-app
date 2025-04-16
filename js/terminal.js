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
        
        this.initializeEventListeners();
        this.initializeTerminal();
        this.initializeHistory(); // Add this line to initialize history functionality
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

    // Initialize the terminal with boot sequence
    initializeTerminal() {
        // First, save the existing content if there's any real conversation
        if (this.chatOutput && this.chatOutput.querySelectorAll('.user-message').length > 0) {
            this.saveCurrentChat();
        }
        
        // Add NEW CHAT button to terminal header
        const controlsDiv = document.querySelector('#terminal-controls');
        
        const newChatButton = document.createElement('button');
        newChatButton.id = 'new-chat-button-header';
        newChatButton.className = 'terminal-button';
        newChatButton.textContent = 'NEW CHAT';
        newChatButton.onclick = () => this.startNewChat();
        
        // Add it before the theme selector
        controlsDiv.insertBefore(newChatButton, controlsDiv.firstChild);
        
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
        
        // CHANGE: Create a single combined boot message
        const bootSteps = [
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
                    this.addMessage('bot', "Hello! I'm GEMINI. How can I assist you today?");
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
                    !content.includes('Memory check') && !content.includes('Loading GEMINI') && 
                    !content.includes('Initializing') && !content.includes('Network connection') &&
                    !content.includes('GEMINI Kernel loaded.')&&
                    !content.includes('Loading language modules') &&
                    !content.includes('Loading creativity engines') &&
                    !content.includes('Loading knowledge base') &&
                    !content.includes('GEMINI AI ready') &&
                    !content.includes('GEMINI/OS') &&
                    !content.includes("Hello! I'm GEMINI")) {
                    
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

    // Replace your current renderMarkdown method

    renderMarkdown(text) {
        // Handle tables - must process these first
        text = this.processMarkdownTables(text);
        
        // Handle code blocks with language specification
        text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
            const lang = language ? ` data-language="${language}"` : '';
            return `<pre${lang}><code>${this.escapeHtml(code.trim())}</code></pre>`;
        });
        
        // Handle inline code
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Handle bold text
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // Handle italic text
        text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        
        // Handle lists (better handling)
        // Unordered lists
        text = text.replace(/(?:^|\n)(\s*)-\s+(.+)(?:\n|$)/g, (match, indent, content) => {
            return `\n${indent}<li>${content}</li>\n`;
        });
        
        // Ordered lists
        text = text.replace(/(?:^|\n)(\s*)\d+\.\s+(.+)(?:\n|$)/g, (match, indent, content) => {
            return `\n${indent}<li class="ordered">${content}</li>\n`;
        });
        
        // Wrap consecutive list items in ul/ol tags
        text = text.replace(/(<li(?:\s+class="ordered")?>.*?<\/li>\n)+/gs, (match) => {
            if (match.includes('class="ordered"')) {
                return `<ol>${match}</ol>`;
            }
            return `<ul>${match}</ul>`;
        });
        
        // Handle headers
        text = text.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        text = text.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        text = text.replace(/^# (.*$)/gm, '<h1>$1</h1>');
        
        // Handle horizontal rules
        text = text.replace(/^\s*---\s*$/gm, '<hr>');
        
        // Handle links
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // Handle Images: ![alt](url)
        text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
            // Basic security check for common protocols
            if (url.startsWith('http:') || url.startsWith('https:') || url.startsWith('data:image')) {
                return `<img src="${this.escapeHtml(url)}" alt="${this.escapeHtml(alt)}" class="rendered-image">`;
            }
            return `[Image: ${this.escapeHtml(alt)} - Invalid URL]`; // Handle potentially unsafe URLs
        });

        // Handle paragraphs better
        text = text.replace(/\n\s*\n/g, '\n<br>\n');
        
        return text;
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
                
                // Clear attached files
                this.attachedFiles = [];
                document.getElementById('file-preview-container').innerHTML = '';
                document.getElementById('file-preview-container').style.display = 'none';
            } else {
                // Regular message without files
                response = await window.geminiAPI.sendMessage(message);
            }
            
            // Add response to chat
            this.addMessage('bot', response);
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

    // Update typeText to return a promise that resolves when typing is complete
    typeText(element, text, speed = 10, chunkDelay = 200) {
        return new Promise(resolve => {
            // Split by double newlines (paragraphs) or single newlines (lines)
            const chunks = text.split(/\n{2,}/g);
            let current = 0;

            const typeChunk = () => {
                if (current < chunks.length) {
                    // Render markdown for this chunk and append
                    const chunkHtml = this.renderMarkdown(chunks[current]);
                    // Append, not replace, to preserve previous content
                    element.innerHTML += (current > 0 ? "<br><br>" : "") + chunkHtml;
                    element.parentElement.scrollTop = element.parentElement.scrollHeight;
                    current++;
                    setTimeout(typeChunk, chunkDelay);
                } else {
                    // All chunks have been typed, resolve the promise
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

    // Initialize chat history functionality
    initializeHistory() {
        // Add a history button to the header
        const controlsDiv = document.querySelector('#terminal-controls');
        
        const historyButton = document.createElement('button');
        historyButton.id = 'history-button';
        historyButton.className = 'terminal-button';
        historyButton.textContent = 'HISTORY';
        historyButton.onclick = () => this.toggleHistoryPanel();
        
        controlsDiv.appendChild(historyButton);
        
        // Create history panel (hidden initially)
        const historyPanel = document.createElement('div');
        historyPanel.id = 'history-panel';
        historyPanel.className = 'history-panel';
        historyPanel.style.display = 'none';
        
        const historyHeader = document.createElement('div');
        historyHeader.className = 'history-header';
        historyHeader.innerHTML = '<span>CHAT HISTORY</span><button id="close-history">X</button>';
        
        const historyList = document.createElement('div');
        historyList.id = 'history-list';
        historyList.className = 'history-list';
        
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'history-buttons-container';
        
        const newChatButton = document.createElement('button');
        newChatButton.id = 'new-chat-button';
        newChatButton.className = 'terminal-button';
        newChatButton.textContent = 'NEW CHAT';
        newChatButton.onclick = () => this.startNewChat();
        
        // Add new "DELETE ALL" button
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
        
        // Add close button listener
        document.querySelector('#close-history').addEventListener('click', () => {
            document.querySelector('#history-panel').style.display = 'none';
        });
        
        // Load saved chats
        this.loadSavedChats();
    }

    // Toggle history panel visibility
    toggleHistoryPanel() {
        const panel = document.querySelector('#history-panel');
        if (panel.style.display === 'none') {
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
                if (content.includes("Hello! I'm GEMINI") || 
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
        this.addMessage('bot', "Hello! I'm GEMINI. How can I assist you today?");
        
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
                // Show the preview container
                previewContainer.style.display = 'flex';
                
                // Process each file
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    
                    // Check file size (20MB limit)
                    if (file.size > 20 * 1024 * 1024) {
                        this.addMessage('error', `File "${file.name}" exceeds 20MB size limit`);
                        continue;
                    }
                    
                    // Add to attached files
                    this.attachedFiles.push(file);
                    
                    // Create preview element
                    const preview = document.createElement('div');
                    preview.className = 'file-preview';
                    preview.innerHTML = `
                        ${file.name}
                        <span class="file-preview-remove" data-filename="${file.name}">×</span>
                    `;
                    
                    // Add remove functionality
                    preview.querySelector('.file-preview-remove').addEventListener('click', () => {
                        this.attachedFiles = this.attachedFiles.filter(f => f.name !== file.name);
                        preview.remove();
                        
                        // Hide container if empty
                        if (this.attachedFiles.length === 0) {
                            previewContainer.style.display = 'none';
                        }
                    });
                    
                    previewContainer.appendChild(preview);
                }
            }
            
            // Reset input so the same file can be selected again
            fileInput.value = '';
        });
    }
}