const socket = io(); // the socket object

let formElm = document.querySelector("#chatForm");
let msgInput = document.querySelector("#newMessage");

// Add debugging
console.log("Form element:", formElm);
console.log("Input element:", msgInput);

// Listen for form submission
if (formElm && msgInput) {
    formElm.addEventListener("submit", newMessagesSubmitted);
    console.log("Event listener added successfully");
} else {
    console.error("Could not find form or input elements!");
}

function newMessagesSubmitted(event) {
    console.log("Form submitted!");
    event.preventDefault(); // stop refresh
    
    let newMsg = msgInput.value.trim();
    console.log("Message to send:", newMsg);
    
    if (newMsg !== "") {
        // Send to server - let server broadcast it back
        socket.emit("newMessage", newMsg);
        console.log("Message sent to server");
        msgInput.value = ""; // clear input
    }
}

// Append messages to chat thread
function appendMessage(txt) {
    console.log("Appending message:", txt);
    
    let chatThreadList = document.querySelector("#threadWrapper ul");
    if (!chatThreadList) {
        console.error("Could not find chat thread list!");
        return;
    }
    
    let newListItem = document.createElement("li");
    newListItem.innerHTML = `<span class="who">someone:</span><span class="words">${txt}</span>`;
    chatThreadList.append(newListItem);
    
    // auto-scroll
    chatThreadList.scrollTop = chatThreadList.scrollHeight;
    
    console.log("Message appended successfully");
}

// Listen for new messages from server
socket.on("newMessage", function(message) {
    console.log("Received message from server:", message);
    appendMessage(message);
});

// Test connection
socket.on('connect', function() {
    console.log('Connected to server with ID:', socket.id);
});

socket.on('disconnect', function() {
    console.log('Disconnected from server');
});