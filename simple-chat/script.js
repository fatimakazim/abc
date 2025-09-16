

let formElm = document.querySelector("#chatform")
console.log(formElm);
let msgInput = document.querySelector("#newMessage")
console.log(msgInput);


// LISTEN FOR NEWLY TYPES MESSAGES, 
// SEND THEM TO THE SERVER

formElm.addEventListener("submit", newMessageSubmitted)

function newMessageSubmitted(event){
    console.log(event);
    event.preventDefault(); 
    let newMsg = msgInput.value
    console.log(newMsg);
    appendMessage(newMsg)}
// LISTEN FOR NEW MESSAGES FROM SERVER
// APPEND THEM TO THE MESSAGE BOX
// AUTO SCROLL TO BOTTOM
msgInput.value = ""
// APPEND MESSAGES TO BOX
function appendMessage(txt){
    
    
console.log(txt)
let chatThreadList = document.querySelector("#threadWrapper ul")
console.log(chatThreadList);


let newListItem = document.createElement("li")
newListItem.innerText = txt

chatThreadList.append(newListItem)
chatThreadList.scrollTop = chatThreadList.scrollHeight

}

// OPTIONAL: LISTEN FOR NEW NAME
// SEND IT TO SERVER
appendMessage("hellooo")