document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const startOverlay = document.getElementById('start-overlay');
    const startButton = document.getElementById('start-button');
    const botVoiceSelect = document.getElementById('bot-voice-select');
    const userVoiceSelect = document.getElementById('user-voice-select');
    const ttsToggle = document.getElementById('tts-toggle');
    const stopSpeakingButton = document.getElementById('stop-speaking');

    // TTS Configuration
    let isTtsEnabled = true;
    const speechSynthesis = window.speechSynthesis;
    let currentlySpeaking = false;
    let speakQueue = [];
    let currentUtterance = null;
    let voices = []; // Store voices globally

    // --- Function Definitions ---

    // Function to format message text (URLs, newlines)
    const formatMessage = (text) => {
        return text.replace(/https?:\/\/[^\s]+/g, (url) => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        }).replace(/\n/g, '<br>');
    };

    // Function to process the next item in the speak queue
    const processNextInQueue = () => {
        currentUtterance = null; // Clear current utterance reference
        if (speakQueue.length > 0 && isTtsEnabled) {
            const nextItem = speakQueue.shift();
            speakSentences(nextItem.text, nextItem.sender); // Start speaking the next item
        } else {
            currentlySpeaking = false; // No more items, stop speaking
        }
    };

    // Function to speak text using TTS, sentence by sentence
    const speakSentences = (text, sender) => {
        if (!isTtsEnabled || !text || !speechSynthesis) {
             if (speakQueue.length > 0) {
                setTimeout(processNextInQueue, 50); // Check queue again shortly if TTS disabled mid-speech
            }
            return;
        }

        // If already speaking, add to queue and return
        if (currentlySpeaking) {
            speakQueue.push({ text: text, sender: sender });
            return;
        }

        currentlySpeaking = true; // Set speaking flag

        // Basic sentence splitting (can be improved)
        const sentences = text.match(/[^.!?]+[.!?]*|[^.!?]+$/g) || [text];
        let sentenceIndex = 0;

        const speakNextSentence = () => {
            // Check if still enabled and speaking this batch
            if (!isTtsEnabled || !currentlySpeaking) {
                // If TTS was disabled or stopped, clear queue for this message
                 console.log("TTS stopped or disabled during sentence sequence.");
                 currentlySpeaking = false; // Ensure flag is reset
                 speakQueue = speakQueue.filter(item => item.text !== text || item.sender !== sender); // Attempt removal (might need better ID)
                 processNextInQueue(); // Try next distinct message if any
                return;
            }

            if (sentenceIndex < sentences.length) {
                const sentence = sentences[sentenceIndex].trim();
                if (sentence) {
                    currentUtterance = new SpeechSynthesisUtterance(sentence);

                    // Select voice
                    const selectedVoiceIndex = sender === 'bot'
                        ? parseInt(botVoiceSelect.value)
                        : parseInt(userVoiceSelect.value);

                    if (voices.length > selectedVoiceIndex && voices[selectedVoiceIndex]) {
                         currentUtterance.voice = voices[selectedVoiceIndex];
                    } else {
                        console.warn(`Voice index ${selectedVoiceIndex} not found.`);
                    }


                    // Set properties (optional, customize as needed)
                    if (sender === 'bot') {
                        currentUtterance.rate = 0.9;
                        currentUtterance.pitch = 1.1;
                    } else {
                         currentUtterance.rate = 1.0;
                         currentUtterance.pitch = 1.0;
                    }


                    // Event handlers for the utterance
                    currentUtterance.onend = () => {
                        sentenceIndex++;
                        speakNextSentence(); // Speak the next sentence
                    };

                    currentUtterance.onerror = (event) => {
                        console.error('SpeechSynthesisUtterance error:', event.error);
                        sentenceIndex++;
                        speakNextSentence(); // Try next sentence even on error
                    };

                    speechSynthesis.speak(currentUtterance);
                } else {
                    // Skip empty sentences
                    sentenceIndex++;
                    speakNextSentence();
                }
            } else {
                // Finished all sentences for this message
                processNextInQueue(); // Process the next message in the main queue
            }
        };

        speakNextSentence(); // Start speaking the first sentence
    };

    // Function to stop speaking immediately and clear the queue
    const stopSpeaking = () => {
        if (speechSynthesis) {
            speakQueue = []; // Clear the queue
            currentlySpeaking = false; // Reset speaking flag
            speechSynthesis.cancel(); // Stop any current utterance
            currentUtterance = null;
             console.log("Speech stopped and queue cleared.");
        }
    };

    // Add message to the chat UI
    const addMessage = (content, sender) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        messageDiv.innerHTML = `<div class="message-content">${formatMessage(content)}</div>`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to bottom

        // Speak the message if TTS is enabled
        if (sender !== 'system') { // Don't speak system messages
            speakSentences(content, sender);
        }
    };

     // Save voice preferences to localStorage
    const saveVoicePreferences = () => {
        localStorage.setItem('botVoiceIndex', botVoiceSelect.value);
        localStorage.setItem('userVoiceIndex', userVoiceSelect.value);
        localStorage.setItem('ttsEnabled', isTtsEnabled.toString());
    };

    // Load voice preferences from localStorage
    const loadVoicePreferences = () => {
        const savedBotVoice = localStorage.getItem('botVoiceIndex');
        const savedUserVoice = localStorage.getItem('userVoiceIndex');
        const savedTtsEnabled = localStorage.getItem('ttsEnabled');

        if (savedBotVoice !== null) botVoiceSelect.value = savedBotVoice;
        if (savedUserVoice !== null) userVoiceSelect.value = savedUserVoice;
        if (savedTtsEnabled !== null) {
            isTtsEnabled = savedTtsEnabled === 'true';
            ttsToggle.checked = isTtsEnabled;
        } else {
             ttsToggle.checked = isTtsEnabled; // Ensure toggle matches default
        }
    };

    // Populate voice selection dropdowns
    const populateVoiceSelections = () => {
        voices = speechSynthesis.getVoices(); // Get available voices
        botVoiceSelect.innerHTML = ''; // Clear existing options
        userVoiceSelect.innerHTML = '';

        if (voices.length === 0) {
            console.warn("No voices available yet. Retrying...");
            // Retry after a short delay if voices aren't loaded
             // Add a one-time listener for voiceschanged
            speechSynthesis.onvoiceschanged = populateVoiceSelections;
            return; // Exit for now, will be recalled by the event
        }
         // Voices loaded, remove the listener if it was added
        speechSynthesis.onvoiceschanged = null;


        let defaultBotVoiceIndex = 0;

        voices.forEach((voice, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${voice.name} (${voice.lang})`;

            botVoiceSelect.appendChild(option.cloneNode(true));
            userVoiceSelect.appendChild(option.cloneNode(true));

             // Try to find a suitable default "elderly female" voice for the bot
            if (voice.lang.startsWith('en') && voice.name.toLowerCase().includes('female')) {
                 if (voice.name.toLowerCase().includes('senior') || voice.name.toLowerCase().includes('old') || voice.name.toLowerCase().includes('grand')) {
                    defaultBotVoiceIndex = index; // Prioritize "elderly" sounding names
                 } else if (defaultBotVoiceIndex === 0) { // Fallback to any English female
                     defaultBotVoiceIndex = index;
                 }
            }
        });

        botVoiceSelect.value = defaultBotVoiceIndex; // Set the found default

        loadVoicePreferences(); // Load saved preferences AFTER populating

         // Ensure loaded values are valid, otherwise reset to default
        if (!voices[parseInt(botVoiceSelect.value)]) {
             botVoiceSelect.value = defaultBotVoiceIndex;
        }
         if (!voices[parseInt(userVoiceSelect.value)]) {
             userVoiceSelect.value = 0; // Default to first voice if saved one is invalid
        }
         saveVoicePreferences(); // Save initial/corrected defaults

        console.log("Voices populated.", voices);
    };


    // Simulate slow typing effect for the bot (just a delay)
    const simulateSlowTyping = (text) => {
        setTimeout(() => {
            addMessage(text, 'bot');
        }, 1500 + Math.random() * 1500); // Delay between 1.5 - 3 seconds
    };

    // Handle sending a message
    async function handleSendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        userInput.value = ''; // Clear input
        stopSpeaking(); // Stop any ongoing speech before user sends new message
        addMessage(message, 'user'); // Add user message to chat

        // Add to conversation history
        conversationHistory.push({ role: "user", content: message });
        if (conversationHistory.length > 15) { // Keep history length manageable
            conversationHistory = [conversationHistory[0], ...conversationHistory.slice(-14)];
        }

        // Show typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'message bot typing';
        typingIndicator.innerHTML = `<div class="message-content"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
        chatMessages.appendChild(typingIndicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        userInput.disabled = true;
        sendButton.disabled = true;

        try {
            const completion = await websim.chat.completions.create({ messages: conversationHistory });
            conversationHistory.push(completion); // Add AI response to history

            chatMessages.removeChild(typingIndicator); // Remove typing indicator
            simulateSlowTyping(completion.content); // Add bot response with delay

        } catch (error) {
            console.error("Error getting AI response:", error);
            if (chatMessages.contains(typingIndicator)) {
                chatMessages.removeChild(typingIndicator);
            }
            addMessage("Oh dear, my connection seems a bit fuzzy right now. Could you say that again?", "bot"); // Add error message
        } finally {
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.focus();
        }
    }

    // --- Initialization and Event Listeners ---

    // Conversation history
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


     // Start Experience Button
    startButton.addEventListener('click', () => {
        startOverlay.style.display = 'none';
        userInput.focus();
        // Attempt to populate voices immediately after user interaction
        populateVoiceSelections();
        // Add initial bot message only after starting
        addMessage(conversationHistory[1].content, "bot"); // Add Edna's first message
    });

    // Send Button
    sendButton.addEventListener('click', handleSendMessage);

    // Enter Key in Textarea
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // Voice Setting Changes
    botVoiceSelect.addEventListener('change', saveVoicePreferences);
    userVoiceSelect.addEventListener('change', saveVoicePreferences);
    ttsToggle.addEventListener('change', () => {
        isTtsEnabled = ttsToggle.checked;
        saveVoicePreferences();
        if (!isTtsEnabled) {
            stopSpeaking(); // Stop speaking if TTS is toggled off
        } else {
             // If toggled on, maybe restart queue if it makes sense?
             // For now, let new messages trigger speech.
        }
    });

    // Stop Speaking Button
    stopSpeakingButton.addEventListener('click', stopSpeaking);

    // Initial setup
    // Populate voices might need user interaction first in some browsers.
    // It's now called after the start button is clicked.
    // If voices are available immediately (less common), try initial population.
     if (speechSynthesis.getVoices().length > 0) {
         populateVoiceSelections();
     } else {
         speechSynthesis.onvoiceschanged = populateVoiceSelections; // Set listener for when they load
     }
});