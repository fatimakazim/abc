const express = require('express');
const https = require('https');
const fs = require('fs');
const { Server } = require("socket.io");

const app = express();
const portHTTPS = 4222;


const options = {
  key: fs.readFileSync('keys-for-local-https/localhost-key.pem'),
  cert: fs.readFileSync('keys-for-local-https/localhost.pem')
};

app.use(express.static('public'));


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

  // FEATURE 1: Relay Emote
  socket.on('send-emote', (data) => {
    io.to(data.targetId).emit('receive-emote', data.emoji);
  });

  // FEATURE 3: Relay Gift
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


HTTPSserver.listen(portHTTPS, function (req, res) {
    console.log("HTTPS Server started at port", portHTTPS);
});