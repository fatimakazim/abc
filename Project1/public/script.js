const CUT = 1;
const parts = location.pathname.replace(/\/+$/,'').split('/').filter(Boolean);
const base = parts.length ? parts.slice(0, -CUT).join('/') : '';

console.log('🔍 Detected base path:', base);
console.log('🔍 Full Socket.IO path:', base + '/socket.io');


const socket = io({ 
  path: base ? '/' + base + '/socket.io' : '/socket.io',
  transports: ['polling', 'websocket']
});

let mySocketId = '';
let allPlayers = {};
let hasVoted = false; 


socket.on('connect', () => {
  console.log('Connected!');
  mySocketId = socket.id;
});



document.getElementById('readyBtn').onclick = () => {
  let name = document.getElementById('nameInput').value.trim();
  
  if (name === '') {
    alert('Please enter your name!');
    return;
  }
  
  socket.emit('my-name', name);
  
  document.getElementById('rulesScreen').style.display = 'none';
  document.getElementById('waiting').style.display = 'block';
};

document.getElementById('startBtn').onclick = () => {
  socket.emit('start-game');
};

document.getElementById('submitBtn').onclick = () => {
  let word = document.getElementById('wordInput').value.trim();
  
  if (word === '') {
    alert('Please enter a word!');
    return;
  }
  
  socket.emit('submit-word', word);
  
  document.getElementById('wordInput').value = '';
  document.getElementById('inputArea').style.display = 'none';
};

document.getElementById('playAgainBtn').onclick = () => {
  location.reload();
};



socket.on('player-count', (count) => {
  document.getElementById('count').textContent = count;
  document.getElementById('totalCount').textContent = count;
});

socket.on('ready-update', (data) => {
  document.getElementById('readyCount').textContent = data.ready;
  
  if (data.ready === data.total && data.total >= 4) {
    document.getElementById('startBtn').style.display = 'block';
  }
});

socket.on('error-message', (message) => {
  alert(message);
});

socket.on('game-started', () => {
  document.getElementById('waiting').style.display = 'none';
  document.getElementById('gameArea').style.display = 'block';
  document.getElementById('submissionsList').innerHTML = '';
});

socket.on('your-role', (data) => {
  document.getElementById('role').textContent = data.role;
  document.getElementById('wordDisplay').textContent = data.info;
});

socket.on('player-list', (playerList) => {
  allPlayers = playerList;
  console.log('Got player list:', allPlayers);
});

socket.on('round-number', (roundNum) => {
  document.getElementById('roundNumber').textContent = roundNum;
});

socket.on('clear-submissions', () => {
  document.getElementById('submissionsList').innerHTML = '';
});

socket.on('turn-start', (data) => {
  if (data.id === mySocketId) {
    document.getElementById('turnText').textContent = "It's YOUR turn!";
    document.getElementById('inputArea').style.display = 'block';
    document.getElementById('wordInput').focus();
  } else {
    document.getElementById('turnText').textContent = data.name + "'s turn";
    document.getElementById('inputArea').style.display = 'none';
  }
});

socket.on('time-update', (seconds) => {
  document.getElementById('timer').textContent = seconds;
});

socket.on('new-word', (data) => {
  let list = document.getElementById('submissionsList');
  let item = document.createElement('li');
  item.textContent = data.name + ': ' + data.word;
  list.appendChild(item);
});


socket.on('must-vote', () => {
  hasVoted = false;
  document.getElementById('gameArea').style.display = 'none';
  document.getElementById('votingScreen').style.display = 'block';
  
  createVoteButtons();
});


function createVoteButtons() {
  let voteList = document.getElementById('playerVoteList');
  voteList.innerHTML = '';
  

  let instruction = document.createElement('p');
  instruction.textContent = 'Everyone must vote. Waiting for all votes...';
  instruction.id = 'voteInstruction';
  voteList.appendChild(instruction);
  
  for (let socketId in allPlayers) {
    let playerName = allPlayers[socketId];
    
    let button = document.createElement('button');
    button.textContent = playerName;
    button.className = 'vote-button';
    button.onclick = () => {
      if (hasVoted) {
        alert('You already voted!');
        return;
      }
      
    
      hasVoted = true;
      
      
      let allButtons = document.querySelectorAll('.vote-button');
      allButtons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
      });
      
     
      button.style.backgroundColor = '#4CAF50';
      button.style.opacity = '1';
      
     
      document.getElementById('voteInstruction').textContent = 
        'You voted for ' + playerName + '. Waiting for other players...';
      
      
      socket.emit('vote-player', socketId);
    };
    voteList.appendChild(button);
  }
}

socket.on('game-over', (data) => {
  document.getElementById('gameArea').style.display = 'none';
  document.getElementById('votingScreen').style.display = 'none';
  
  document.getElementById('resultScreen').style.display = 'block';
  
  let message = '';
  if (data.wasImposter) {
    message = '🎉 DETECTIVES WIN! 🎉\n\n' + data.votedName + ' was the IMPOSTER!\n(Received ' + data.voteCount + ' votes)';
  } else {
    message = '😈 IMPOSTER WINS! 😈\n\n' + data.votedName + ' was NOT the Imposter!\n(Received ' + data.voteCount + ' votes)';
  }
  
  document.getElementById('resultMessage').textContent = message;
});

socket.on('game-reset', () => {
  alert('Game reset - not enough players');
  location.reload();
});