const socket = io(); // the socket object
let formElm = document.querySelector("#chatForm");
let msgInput = document.querySelector("#newMessage");
let nameInput = document.querySelector("#nameWrapper input");
const codenames = {
    "max": "😎",
    "alex": "🧑‍💻",
    "rob": "🤖"
};


// Personal features data
let userName = "";
let messageHistory = [];
let favoriteWords = ["awesome", "cool", "great", "love", "amazing", "wonderful", "beautiful" ,"gorg" ,"slay" ,"queen", "pretty"];
let bannedWords = ["spam", "hate", "stupid", "idiot", "loser", "ugly"]; // simple word filter


// debugging
console.log("Form element:", formElm);
console.log("Input element:", msgInput);

// Listen for form submission
if (formElm && msgInput) {
    formElm.addEventListener("submit", newMessagesSubmitted);
    console.log("Event listener added successfully");
} else {
    console.error("Could not find form or input elements!");
}

// Getting the user name when they type it
if (nameInput) {
    nameInput.addEventListener("input", function() {
        userName = nameInput.value.trim();
        console.log("User name set to:", userName);
    });
}

function newMessagesSubmitted(event) {
    console.log("Form submitted!");
    event.preventDefault(); // to stop refresh
    
    let newMsg = msgInput.value.trim();
    console.log("Message to send:", newMsg);
    
    if (newMsg !== "" && userName !== "") {
        // Filter out banned words using .filter() and .map()
      let words = newMsg.split(" "); // split message into words

let cleanWords = words.map(word => {
    // Check banned words first
    let isBanned = bannedWords.some(banned => word.toLowerCase().includes(banned.toLowerCase()));
    if (isBanned) return "🤬🤬🤬******";

    // Check if word is a codename
    let codenameEmoji = codenames[word.toLowerCase()];
    if (codenameEmoji) return codenameEmoji;

    // Otherwise, keep word as is
    return word;
});

let cleanMessage = cleanWords.join(" ");

        
        //check for favorite words
        let foundFavorites = words.filter(word => 
            favoriteWords.includes(word.toLowerCase())
        );
        
        // Add emoji if user used favorite words
        if (foundFavorites.length > 0) {
            cleanMessage += " 😌🤏🏽";
        }
        
        // Create message object with user info
        let messageObj = {
            text: cleanMessage,
            user: userName,
            timestamp: new Date().toLocaleTimeString(),
            id: Date.now()
        };
        
        // Send to server
        socket.emit("newMessage", messageObj);
        console.log("Message sent to server");
        msgInput.value = ""; // clear input
    } else if (userName === "") {
        alert("Please enter your name first!");
    }
}

function appendMessage(messageObj) {
    let chatThreadList = document.querySelector("#threadWrapper ul");
    if (!chatThreadList) {
        console.error("Could not find chat thread list!");
        return;
    }
    
    let newListItem = document.createElement("li");
    
    // Coloring  messages differently
    let messageClass = messageObj.user === userName ? "my-message" : "other-message";
    
    newListItem.innerHTML = `
        <span class="who ${messageClass}">${messageObj.user}:</span>
        <span class="words">${messageObj.text}</span>
        <span class="timestamp">${messageObj.timestamp}</span>
    `;
    
    chatThreadList.append(newListItem);
    
    // auto-scroll
    chatThreadList.scrollTop = chatThreadList.scrollHeight;
}


// Listen for new messages from server
socket.on("newMessage", function(messageObj) {
    appendMessage(messageObj);
});

// Test connection
socket.on('connect', function() {
    console.log('Connected to server');
});

socket.on('disconnect', function() {
    console.log('Disconnected from server');
});

// Welcome message when page loads
window.addEventListener('load', function() {
    console.log("💬 Simple Chat:");
    console.log("- Enter your name to start");
    console.log("- Favorite words get emoji: " + favoriteWords.join(", "));
});