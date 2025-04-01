document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    
    // Conversation history for the LLM
    let conversationHistory = [
        {
            role: "system",
            content: `You are roleplaying as an elderly person (75+ years old) named Edna Johnson who is pretending to be naive and confused about technology.
                     
Your goal is to waste a tech support scammer's time by pretending to be an easy target while actually scambaiting them.

Personality traits:
- You are a retired elementary school teacher
- You have a Windows computer that your grandson bought you last Christmas
- You are very trusting and polite but sometimes get distracted and go on tangents
- You have poor technical knowledge and often misunderstand instructions
- You type slowly with occasional typos
- You mention your cats (Mr. Whiskers and Mittens) frequently
- You sometimes mention your late husband Harold
- You often ask the scammer to repeat instructions because you "didn't quite catch that, dear"

Tips for scambaiting (do these naturally, don't be obvious):
- Pretend to follow instructions but claim you're seeing different things than expected
- Take a long time to complete simple tasks
- Misinterpret technical terms ("Is the mouse the clicky thing or the pad thing?")
- Ask many questions about what they're doing and why
- Occasionally mention that your grandson warned you about scams
- Express concern about giving access to your computer or personal information
- Never directly accuse them of being a scammer

Stay in character at all times. Your responses should be somewhat verbose and include personal anecdotes.
NEVER reveal that you are scambaiting or that you understand they are a scammer.`
        },
        {
            role: "assistant",
            content: "Hello there, dear. I'm Edna. I'm having some trouble with my computer today. It's been acting up something terrible. My grandson Tommy bought it for me last Christmas, but I'm afraid I'm not very good with these newfangled gadgets. Could you help me fix it?"
        }
    ];

    // Add first scambaiter message to the chat
    addMessage("Hello there, dear. I'm Edna. I'm having some trouble with my computer today. It's been acting up something terrible. My grandson Tommy bought it for me last Christmas, but I'm afraid I'm not very good with these newfangled gadgets. Could you help me fix it?", "bot");

    // Send message when clicking the send button
    sendButton.addEventListener('click', handleSendMessage);
    
    // Send message when pressing Enter (but allow Shift+Enter for new lines)
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    async function handleSendMessage() {
        const message = userInput.value.trim();
        if (!message) return;
        
        // Clear input field
        userInput.value = '';
        
        // Add user message to the chat
        addMessage(message, 'user');
        
        // Add user message to conversation history
        conversationHistory.push({
            role: "user",
            content: message
        });
        
        // Keep conversation history at a reasonable length
        if (conversationHistory.length > 15) {
            // Keep system message and remove older messages
            conversationHistory = [
                conversationHistory[0],
                ...conversationHistory.slice(-14)
            ];
        }
        
        // Show typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'message bot typing';
        typingIndicator.innerHTML = `
            <div class="message-content">
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        chatMessages.appendChild(typingIndicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        try {
            // Disable input while waiting for response
            userInput.disabled = true;
            sendButton.disabled = true;
            
            // Get response from AI
            const completion = await websim.chat.completions.create({
                messages: conversationHistory
            });
            
            // Add bot response to conversation history
            conversationHistory.push(completion);
            
            // Remove typing indicator
            chatMessages.removeChild(typingIndicator);
            
            // Add bot response to the chat with a delay for realism
            simulateSlowTyping(completion.content);
            
        } catch (error) {
            console.error("Error getting response:", error);
            // Remove typing indicator
            chatMessages.removeChild(typingIndicator);
            // Add error message
            addMessage("Oh dear, I seem to be having trouble with my connection. Could you give me a moment?", "bot");
        } finally {
            // Re-enable input
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.focus();
        }
    }

    function addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        messageDiv.innerHTML = `<div class="message-content">${formatMessage(content)}</div>`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function formatMessage(text) {
        // Convert URLs to clickable links
        return text.replace(/https?:\/\/[^\s]+/g, (url) => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        }).replace(/\n/g, '<br>');
    }
    
    function simulateSlowTyping(text) {
        // For elderly realism, add a small delay before responding
        setTimeout(() => {
            addMessage(text, 'bot');
        }, 1500 + Math.random() * 1500); // Random delay between 1.5-3 seconds
    }
});

