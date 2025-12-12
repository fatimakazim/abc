const express = require('express');
const https = require("https");
const fs = require("fs");
const cors = require('cors'); 

const app = express();
const portHTTPS = 4220;

// 1. Enable CORS to allow the browser to talk to the server
app.use(cors({ origin: "*" })); 
app.use(express.static('public'));

// 2. Load Keys
let options = {};
try {
    options = {
        key: fs.readFileSync("keys-for-local-https/localhost-key.pem"),
        cert: fs.readFileSync("keys-for-local-https/localhost.pem"),
    };
    console.log("✅ SSL Keys loaded successfully.");
} catch (error) {
    console.error("❌ CRITICAL ERROR: Could not find SSL keys. Server will crash.", error.message);
}

const server = https.createServer(options, app);
const { Server } = require("socket.io");

const io = new Server(server, {
    
    path: "/socket.io",
    cors: {
        origin: "*", // Allow all connections
        methods: ["GET", "POST"],
        credentials: true
    }
});

// LOW-LEVEL DEBUGGING 

server.on('request', (req, res) => {
    // Only log socket requests to avoid spamming
    if (req.url.includes('socket.io')) {
        console.log(`🔎 Incoming Request: ${req.method} ${req.url}`);
    }
});

let activeRooms = {}; 

io.on('connection', (socket) => {
    console.log('✅ SUCCESS: User connected:', socket.id);

    socket.on('create-room', (data) => {
    activeRooms[socket.id] = { 
        socketId: socket.id, 
        name: data.name, 
        image: data.image,
        furniture: data.furniture || [] // Stores the furniture list
    };
    io.emit('update-room-list', activeRooms);
  });

    socket.on('get-rooms', () => {
        socket.emit('update-room-list', activeRooms);
    });

   socket.on('request-visit', (data) => {
    const targetId = data.targetId;
    const hostRoom = activeRooms[targetId];
    
    if (hostRoom) {
      //  Tell the VISITOR  "You successfully joined the room. Here is their data."
      socket.emit('join-room-success', { 
          hostName: hostRoom.name,
          hostImage: hostRoom.image,
          hostFurniture: hostRoom.furniture
      });

      //  Tell the HOST (Friend): "Someone has arrived!"
      io.to(targetId).emit('visitor-arrived', { 
          name: data.myData.name, 
          image: data.myData.image 
      });
    }
  });

    socket.on('send-emote', (data) => {
        io.to(data.targetId).emit('receive-emote', data.emoji);
    });

    socket.on('send-gift', (data) => {
        io.to(data.targetId).emit('receive-gift', data.type);
    });

    socket.on('leave-room', () => { 
        socket.broadcast.emit('visitor-left'); 
    });
  
    socket.on('disconnect', () => {
        delete activeRooms[socket.id];
        io.emit('update-room-list', activeRooms);
        socket.broadcast.emit('visitor-left');
    });
});

server.listen(portHTTPS, () => {
    console.log("🔒 HTTPS Server started at port", portHTTPS);
});