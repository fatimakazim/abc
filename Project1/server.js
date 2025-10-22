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


let players = {};
let gameWords = ['Elon Musk', 'New York', 'Marathon', 'Shadow', 'Youtube'];
let gameHints = ['🚀', '🐀', '🏆', '🕴️', '📱'];

let gameStarted = false;
let currentWord = '';
let currentHint = '';
let currentPlayerIndex = 0;
let playerOrder = [];
let timeLeft = 40;
let currentRound = 1;
let countdownInterval = null;


let voteCount = {};  
let totalVotes = 0;  


io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  players[socket.id] = {
    name: '',
    role: '',
    submission: ''
  };

  io.emit('player-count', Object.keys(players).length);

  socket.on('my-name', (name) => {
    players[socket.id].name = name;
    console.log(name + ' is ready!');
    
    let readyCount = 0;
    for (let id in players) {
      if (players[id].name !== '') readyCount++;
    }
    io.emit('ready-update', {
      ready: readyCount,
      total: Object.keys(players).length
    });
  });

  socket.on('start-game', () => {
    if (Object.keys(players).length < 4) {
      socket.emit('error-message', 'Need at least 4 players!');
      return;
    }
    
    gameStarted = true;
    currentRound = 1;
    voteCount = {};
    totalVotes = 0;
    
    let randomIndex = Math.floor(Math.random() * gameWords.length);
    currentWord = gameWords[randomIndex];
    currentHint = gameHints[randomIndex];
    
    playerOrder = Object.keys(players);
    playerOrder.sort(() => Math.random() - 0.5);
    
    players[playerOrder[0]].role = 'Imposter';
    for (let i = 1; i < playerOrder.length; i++) {
      players[playerOrder[i]].role = 'Detective';
    }
    
    for (let id in players) {
      if (players[id].role === 'Imposter') {
        io.to(id).emit('your-role', {
          role: 'Imposter',
          info: 'Hint: ' + currentHint
        });
      } else {
        io.to(id).emit('your-role', {
          role: 'Detective',
          info: 'Word: ' + currentWord
        });
      }
    }
    
    let playerList = {};
    for (let id in players) {
      playerList[id] = players[id].name;
    }
    io.emit('player-list', playerList);
    io.emit('game-started');
    io.emit('round-number', currentRound);
    
    currentPlayerIndex = 0;
    startTurn();
  });

  socket.on('submit-word', (word) => {
    players[socket.id].submission = word;
    
    io.emit('new-word', {
      name: players[socket.id].name,
      word: word
    });
    
    currentPlayerIndex++;
    
    if (currentPlayerIndex >= playerOrder.length) {
      if (currentRound === 3) {
        
        voteCount = {};
        totalVotes = 0;
        io.emit('must-vote');
      } else {
        currentRound++;
        currentPlayerIndex = 0;
        
        for (let id in players) {
          players[id].submission = '';
        }
        
        io.emit('round-number', currentRound);
        io.emit('clear-submissions');
        
        startTurn();
      }
    } else {
      startTurn();
    }
  });

  
  socket.on('vote-player', (votedSocketId) => {
    
    // 1. Check if the player is there
    if (!voteCount[votedSocketId]) {
      voteCount[votedSocketId] = 0;
    }
    
    // 2. Add one vote
    voteCount[votedSocketId]++;
    
    // 3. Increment total
    totalVotes++;
    
    console.log(`${players[socket.id].name} voted for ${players[votedSocketId].name}`);
    console.log(`${players[votedSocketId].name} now has ${voteCount[votedSocketId]} votes`);
    console.log(`Progress: ${totalVotes}/${playerOrder.length} players voted`);
    
    // 4. Check if everyone voted
    if (totalVotes === playerOrder.length) {
      
      // 5. Finding player with most votes 
      let maxVotes = 0;
      let eliminatedId = null;
      
      for (let playerId in voteCount) {
        if (voteCount[playerId] > maxVotes) {
          maxVotes = voteCount[playerId];
          eliminatedId = playerId;
        }
      }
      
      // 6. Determine winner
      let eliminatedName = players[eliminatedId].name;
      let eliminatedRole = players[eliminatedId].role;
      let detectivesWin = (eliminatedRole === 'Imposter');
      
      // 7. Send results
      io.emit('game-over', {
        votedName: eliminatedName,
        wasImposter: detectivesWin,
        detectivesWin: detectivesWin,
        voteCount: maxVotes
      });
      
      // 8. Reset game
      gameStarted = false;
      currentRound = 1;
      voteCount = {};
      totalVotes = 0;
      for (let id in players) {
        players[id].role = '';
        players[id].submission = '';
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Player left:', socket.id);
    delete players[socket.id];
    
    io.emit('player-count', Object.keys(players).length);
    
    if (Object.keys(players).length < 4 && gameStarted) {
      gameStarted = false;
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      io.emit('game-reset');
    }
  });
});

function startTurn() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  
  let currentPlayerId = playerOrder[currentPlayerIndex];
  let currentPlayerName = players[currentPlayerId].name;
  
  io.emit('turn-start', {
    name: currentPlayerName,
    id: currentPlayerId
  });
  
  timeLeft = 40;
  countdownInterval = setInterval(() => {
    timeLeft--;
    
    io.emit('time-update', timeLeft);
    
    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      
      players[currentPlayerId].submission = '(no answer)';
      
      io.emit('new-word', {
        name: currentPlayerName,
        word: '(no answer)'
      });
      
      currentPlayerIndex++;
      if (currentPlayerIndex >= playerOrder.length) {
        if (currentRound === 3) {
          voteCount = {};
          totalVotes = 0;
          io.emit('must-vote');
        } else {
          currentRound++;
          currentPlayerIndex = 0;
          for (let id in players) {
            players[id].submission = '';
          }
          io.emit('round-number', currentRound);
          io.emit('clear-submissions');
          startTurn();
        }
      } else {
        startTurn();
      }
    }
  }, 1000);
}

server.listen(4220, () => {
  console.log("Server running on https://localhost:4220");
});