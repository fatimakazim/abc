const express = require('express');
const https = require("https");
const fs = require("fs");


const app = express();
app.use(express.static('public'));




const options = {
 key: fs.readFileSync("keys-for-local-https/localhost-key.pem"),
 cert: fs.readFileSync("keys-for-local-https/localhost.pem"),
};
const server = https.createServer(options, app);
const { Server } = require("socket.io");
const io = new Server(server);

io.on('connection', (socket) => {
    console.log('A user connected', socket.id);
    
    // IMPORTANT: All socket event listeners must be INSIDE this connection callback
    socket.on("newMessage", function(incomingMessage){
        console.log("got a msg:", incomingMessage);
        
        // Broadcast the message to ALL connected clients (including sender)
        io.emit("newMessage", incomingMessage);
    });
    
    socket.on('disconnect', () => {
        console.log('A user disconnected', socket.id);
    });
});

HTTPSserver.listen(portHTTPS, function (req, res) {
    console.log("HTTPS Server started at port", portHTTPS);
});