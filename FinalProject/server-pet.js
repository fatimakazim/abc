const express = require('express');
const https = require('https');
const fs = require('fs');
const { Server } = require("socket.io");

const app = express();

const options = {
  key: fs.readFileSync('keys-for-local-https/localhost-key.pem'),
  cert: fs.readFileSync('keys-for-local-https/localhost.pem')
};

// --- FIX FOR 404 ERROR ---
// Allow the 'public' folder to be seen at the main URL AND the specific path
app.use(express.static('public'));
app.use('/fatima/port-4222', express.static('public'));
// -------------------------

const server = https.createServer(options, app);
const io = new Server(server, { maxHttpBufferSize: 1e8 });

let activeRooms = {}; 

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('create-room', (data) => {
    activeRooms[socket.id] = { socketId: socket.id, name: data.name, image: data.image };
    io.emit('update-room-list', activeRooms);
  });

  socket.on('get-rooms', () => {
    socket.emit('update-room-list', activeRooms);
  });

  socket.on('request-visit', (data) => {
    const targetId = data.targetId;
    if (activeRooms[targetId]) {
      socket.emit('visitor-arrived', activeRooms[targetId]);
      io.to(targetId).emit('visitor-arrived', { name: data.myData.name, image: data.myData.image });
    }
  });

  socket.on('send-emote', (data) => {
    io.to(data.targetId).emit('receive-emote', data.emoji);
  });

  socket.on('send-gift', (data) => {
    io.to(data.targetId).emit('receive-gift', data.type);
  });

  socket.on('leave-room', () => { socket.broadcast.emit('visitor-left'); });
  
  socket.on('disconnect', () => {
    delete activeRooms[socket.id];
    io.emit('update-room-list', activeRooms);
    socket.broadcast.emit('visitor-left');
  });
});

// --- FIX FOR CRASH ---
// Using the correct variable 'server' and port 4222
server.listen(4222, () => {
    console.log("HTTPS Server started at port 4222");
});