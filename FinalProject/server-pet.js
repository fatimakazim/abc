const express = require('express');
const https = require("https");
const fs = require("fs");
const cors = require('cors'); 

const app = express();
const portHTTPS = 4220;

app.use(cors({ origin: "*" })); 
app.use(express.static('public'));

let options = {};
try {
    options = {
        key: fs.readFileSync("keys-for-local-https/localhost-key.pem"),
        cert: fs.readFileSync("keys-for-local-https/localhost.pem"),
    };
    console.log("✅ SSL Keys loaded successfully.");
} catch (error) {
    console.error("❌ CRITICAL ERROR: Could not find SSL keys.", error.message);
}

const server = https.createServer(options, app);
const { Server } = require("socket.io");

const io = new Server(server, {
    path: "/socket.io",
    cors: { origin: "*", methods: ["GET", "POST"], credentials: true }
});

server.on('request', (req, res) => {
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
            furniture: data.furniture || [],
            wallColor: data.wallColor || '#f0f8ff' // New: Save Wall Color
        };
        io.emit('update-room-list', activeRooms);
    });

    // Handle updates (furniture or wall color)
    socket.on('update-room-data', (data) => {
        if (activeRooms[socket.id]) {
            if(data.furniture) activeRooms[socket.id].furniture = data.furniture;
            if(data.wallColor) activeRooms[socket.id].wallColor = data.wallColor;
        }
    });

    socket.on('get-rooms', () => {
        socket.emit('update-room-list', activeRooms);
    });

    socket.on('request-visit', (data) => {
        const targetId = data.targetId;
        const hostRoom = activeRooms[targetId];
        
        if (hostRoom) {
            socket.emit('join-room-success', { 
                hostName: hostRoom.name,
                hostImage: hostRoom.image,
                hostFurniture: hostRoom.furniture,
                hostWallColor: hostRoom.wallColor // New: Send Wall Color
            });

            io.to(targetId).emit('visitor-arrived', { 
                name: data.myData.name, 
                image: data.myData.image 
            });
        }
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