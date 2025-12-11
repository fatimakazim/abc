let socket;
let myPet = { name: "", image: null, x: 250, y: 350 };
let friendPet = null; 
let allRooms = {}; 

let happiness = 5;
let lastInteractionTime = Date.now(); 
let furnitureList = []; 
let furnitureImages = {}; 

let drawingSketch, roomSketch;
let bounceVal = 0;
let reactionTimer = 0;
let draggedFurniture = null;

let currentEmote = null;
let emoteTimer = 0;

// --- INITIALIZE ---
window.addEventListener('DOMContentLoaded', () => {
  setupSocket();
  setupUI();
  loadGameData();
});

function setupSocket() {
 if (location.hostname.toLowerCase().startsWith('browsercircus') || location.hostname.toLowerCase().startsWith('www')) {
  socket = io({ path: "/fatima/port-4220/socket.io" });
} else {
  socket = io();
}
  
  socket.on('update-room-list', (rooms) => { allRooms = rooms; updateFriendsUI(); });
  
  socket.on('visitor-arrived', (data) => {
    friendPet = { ...data, x: 100, y: 350 }; 
    alert(`${data.name} is visiting!`);
    changeHappiness(1);
  });
  
  socket.on('visitor-left', () => { friendPet = null; });

  socket.on('receive-emote', (emoji) => {
    currentEmote = emoji;
    emoteTimer = 100; 
  });
}

function setupUI() {
  document.getElementById('start-btn').onclick = () => {
    myPet.name = document.getElementById('pet-name').value || "Pet";
    showScreen('drawing');
    initDrawingCanvas();
  };

  document.getElementById('finish-drawing-btn').onclick = () => {
    const cnv = document.querySelector('#drawing-canvas-wrapper canvas');
    myPet.image = cnv.toDataURL();
    saveGameData();
    showScreen('room');
    initRoomCanvas();
    socket.emit('create-room', { name: myPet.name, image: myPet.image });
  };

  document.querySelectorAll('.emote-btn').forEach(btn => {
    btn.onclick = (e) => {
      const emoji = e.target.innerText;
      currentEmote = emoji;
      emoteTimer = 100;
      if(friendPet) {
        socket.emit('send-emote', { targetId: friendPet.socketId, emoji: emoji });
      }
    };
  });

  document.getElementById('add-furniture-btn').onclick = () => document.getElementById('furniture-modal').classList.remove('hidden');
  document.getElementById('visit-friend-btn').onclick = () => {
    document.getElementById('friends-modal').classList.remove('hidden');
    socket.emit('get-rooms');
  };
  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.onclick = (e) => document.getElementById(e.target.dataset.target).classList.add('hidden');
  });

  document.querySelectorAll('.furn-item').forEach(item => {
    item.onclick = () => {
      furnitureList.push({ type: item.dataset.type, x: 250, y: 300 });
      saveGameData();
      document.getElementById('furniture-modal').classList.add('hidden');
    };
  });

  document.getElementById('go-home-btn').onclick = () => {
    socket.emit('leave-room');
    friendPet = null;
    document.getElementById('room-title').innerText = "🏠 My Room";
    document.getElementById('visit-friend-btn').classList.remove('hidden');
    document.getElementById('go-home-btn').classList.add('hidden');
    socket.emit('create-room', { name: myPet.name, image: myPet.image });
  };
}

function updateFriendsUI() {
  const container = document.getElementById('friends-list-container');
  container.innerHTML = '';
  const friends = Object.values(allRooms).filter(r => r.socketId !== socket.id);

  if(friends.length === 0) container.innerHTML = '<p style="padding:10px; color:#999;">No friends online.</p>';

  friends.forEach(f => {
    const row = document.createElement('div');
    row.className = 'friend-row';
    row.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <img src="${f.image}"> <span>${f.name}</span>
      </div>
      <button class="action-btn" style="width:auto; padding:5px 10px;">Visit</button>
    `;
    row.querySelector('button').onclick = () => {
      socket.emit('request-visit', { targetId: f.socketId, myData: myPet });
      document.getElementById('friends-modal').classList.add('hidden');
      document.getElementById('room-title').innerText = `🏠 Visiting ${f.name}`;
      
      document.getElementById('visit-friend-btn').classList.add('hidden');
      document.getElementById('go-home-btn').classList.remove('hidden');
    };
    container.appendChild(row);
  });
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(id + '-screen').classList.remove('hidden');
}

function saveGameData() {
  localStorage.setItem('petRoomSave', JSON.stringify({ myPet, furnitureList, happiness }));
}

function loadGameData() {
  const saved = localStorage.getItem('petRoomSave');
  if(saved) {
    const data = JSON.parse(saved);
    myPet = data.myPet;
    furnitureList = data.furnitureList;
    happiness = data.happiness;
    if(myPet.image) {
      showScreen('room');
      initRoomCanvas();
      setTimeout(() => socket.emit('create-room', { name: myPet.name, image: myPet.image }), 500);
    }
  }
}

// --- DRAWING CANVAS  ---
function initDrawingCanvas() {
  if(drawingSketch) return;
  const s = (p) => {
    let currentTool = 'pen';
    let currentColor = '#000000';
    
    p.setup = () => { 
      // DYNAMIC SIZE: Fits the mobile screen
      let size = Math.min(window.innerWidth - 40, 350);
      p.createCanvas(size, size); 
      p.clear(); 
      p.textAlign(p.CENTER, p.CENTER);
      
      // Stop scrolling when touching canvas
      let c = document.querySelector('#drawing-canvas-wrapper canvas');
      if(c) {
        c.addEventListener('touchstart', (e)=>e.preventDefault(), {passive:false});
        c.addEventListener('touchmove', (e)=>e.preventDefault(), {passive:false});
      }
    };
    
    p.draw = () => {
      if (p.mouseIsPressed) {
        if (currentTool === 'pen') {
          p.noErase(); p.stroke(currentColor); p.strokeWeight(5);
          p.line(p.mouseX, p.mouseY, p.pmouseX, p.pmouseY);
        } else if (currentTool === 'eraser') {
          p.erase(); p.strokeWeight(20);
          p.line(p.mouseX, p.mouseY, p.pmouseX, p.pmouseY); p.noErase();
        }
      }
      // Draw guide eyes in the center
      drawCharacterEyes(p, p.width/2, p.height/2, 'happy');
    };
    
    document.querySelectorAll('.tool-btn').forEach(b => b.onclick = (e) => {
      if(e.target.dataset.tool === 'clear') p.clear(); else currentTool = e.target.dataset.tool;
    });
    document.querySelectorAll('.color-dot').forEach(b => b.onclick = (e) => currentColor = e.target.dataset.color);
  };
  drawingSketch = new p5(s, 'drawing-canvas-wrapper');
}

// --- ROOM CANVAS  ---
function initRoomCanvas() {
  if(roomSketch) return;
  const s = (p) => {
    let myPetImg, friendPetImg;
    p.setup = () => {
      // DYNAMIC SIZE: Width of screen, limited height
      let w = Math.min(window.innerWidth - 30, 500);
      let h = Math.min(window.innerHeight * 0.6, 400);
      p.createCanvas(w, h); 
      p.imageMode(p.CENTER); p.textAlign(p.CENTER);
      
      if(myPet.image) myPetImg = p.loadImage(myPet.image);
      ['bed','table','plant','sofa'].forEach(k => furnitureImages[k] = p.loadImage(`furniture/${k}.png`));

      // Stop scrolling when touching room
      let c = document.querySelector('#game-canvas-wrapper canvas');
      if(c) {
        c.addEventListener('touchstart', (e)=>e.preventDefault(), {passive:false});
        c.addEventListener('touchmove', (e)=>e.preventDefault(), {passive:false});
      }
    };
    p.draw = () => {
      p.background('#f0f8ff');
      p.noStroke(); p.fill('#e1d2b8'); p.rect(0, p.height-100, p.width, 100);

      if (Date.now() - lastInteractionTime > 10000 && happiness > 0) {
        changeHappiness(-1);
        lastInteractionTime = Date.now(); 
      }

      checkInteractions(p);

      furnitureList.forEach(item => {
        let img = furnitureImages[item.type];
        if(img && img.width > 1) p.image(img, item.x, item.y, 80, 80);
        else { p.fill(0); p.text("📦", item.x, item.y); }
      });

      if(friendPet) {
        if(!friendPetImg && friendPet.image) friendPetImg = p.loadImage(friendPet.image);
        updatePet(p, friendPet, friendPetImg, false);
      }
      updatePet(p, myPet, myPetImg, true);
      
      if(reactionTimer > 0) { p.textSize(30); p.text('❤️', myPet.x, myPet.y - 70); reactionTimer--; }

      if (emoteTimer > 0 && currentEmote) {
        p.textSize(50);
        p.text(currentEmote, myPet.x, myPet.y - 90);
        emoteTimer--;
      }
    };

    p.mousePressed = () => {
      for(let i=furnitureList.length-1; i>=0; i--) {
        if(p.dist(p.mouseX, p.mouseY, furnitureList[i].x, furnitureList[i].y) < 40) {
          draggedFurniture = furnitureList[i]; return;
        }
      }
      if(p.dist(p.mouseX, p.mouseY, myPet.x, myPet.y) < 50) {
        changeHappiness(1); 
        reactionTimer = 20; 
        bounceVal = 10; 
        lastInteractionTime = Date.now(); 
        saveGameData();
      }
    };
    p.mouseDragged = () => { if(draggedFurniture) { draggedFurniture.x = p.mouseX; draggedFurniture.y = p.mouseY; }};
    p.mouseReleased = () => { if(draggedFurniture) { draggedFurniture = null; saveGameData(); }};
  };
  roomSketch = new p5(s, 'game-canvas-wrapper');
}

function updatePet(p, pet, img, isMine) {
  let mood = 'happy';
  if (happiness <= 0) mood = 'tired';
  else if (happiness < 2) mood = 'sad';
  else if (happiness < 4) mood = 'bored';
  else mood = 'happy';

  if (mood !== 'tired') {
    if(p.frameCount % 60 === 0) pet.moveDir = Math.random() > 0.5 ? 1 : Math.random() > 0.7 ? 0 : -1;
    // Constrain to screen width dynamically
    pet.x = p.constrain(pet.x + (pet.moveDir||0), 50, p.width - 50);
  }

  p.push();
  p.translate(pet.x, pet.y);

  if (mood === 'tired') {
     p.translate(0, Math.sin(p.frameCount * 0.05) * 1);
  } else if(isMine && bounceVal > 0) { 
     p.translate(0, -bounceVal); bounceVal *= 0.9; 
  } else {
     p.translate(0, Math.sin(p.frameCount * 0.1) * 2);
  }
  
  p.fill(0,0,0,30); p.ellipse(0, 45, 60, 10); 

  let sX = 1;
  if((pet.moveDir||0) < 0) sX = -1;
  p.scale(sX, 1);

  if(img && img.width > 1) {
      p.image(img, 0, 0, 80, 80); 
  } else { 
      p.textSize(40); p.text("👻", 0, 0); 
  }

  drawCharacterEyes(p, 0, 0, mood);

  p.scale(sX, 1); 
  p.fill(0); p.noStroke(); p.textSize(12); p.textAlign(p.CENTER);
  p.text(pet.name, 0, 55);
  p.pop();
}

function checkInteractions(p) {
  if (!friendPet) return;
  let d = p.dist(myPet.x, myPet.y, friendPet.x, friendPet.y);
  if (d < 60) {
    lastInteractionTime = Date.now();
    if (p.frameCount % 60 === 0) {
       changeHappiness(1);
       reactionTimer = 30; 
    }
  }
}

function changeHappiness(amt) {
  happiness = Math.min(5, Math.max(0, happiness + amt));
  document.getElementById('happiness-display').innerText = "❤️".repeat(Math.floor(happiness)) + "🤍".repeat(5-Math.floor(happiness));
}

function drawCharacterEyes(p, x, y, mood) {
  p.push();
  p.translate(x, y);
  
  let eyeW = 20;       
  let eyeH = 26;       
  
  p.fill(255); p.stroke(0); p.strokeWeight(2);

  if (mood === 'tired') {
    p.noFill();
    p.arc(-12, 5, 20, 10, p.PI, 0); 
    p.arc(12, 5, 20, 10, p.PI, 0);
    p.noStroke(); p.fill(0); p.textSize(15); p.text("z", 25, -10);
  } else if (mood === 'bored') {
    p.fill(255); p.stroke(0);
    p.ellipse(-12, 0, eyeW, eyeH); p.ellipse(12, 0, eyeW, eyeH);
    p.fill(0); p.noStroke();
    p.ellipse(-12, 2, 6, 6); p.ellipse(12, 2, 6, 6);
    p.fill(255); p.stroke(0);
    p.arc(-12, 0, eyeW, eyeH, p.PI, 0, p.CHORD);
    p.arc(12, 0, eyeW, eyeH, p.PI, 0, p.CHORD);
  } else if (mood === 'sad') {
    p.fill(255); p.stroke(0);
    p.ellipse(-12, 0, eyeW, eyeH); p.ellipse(12, 0, eyeW, eyeH);
    p.fill(0); p.noStroke();
    p.ellipse(-12, 6, 8, 8); p.ellipse(12, 6, 8, 8);
    p.fill(255);
    p.ellipse(-10, 4, 3, 3); p.ellipse(14, 4, 3, 3);
  } else {
    p.fill(255); p.stroke(0);
    p.ellipse(-12, 0, eyeW, eyeH); p.ellipse(12, 0, eyeW, eyeH);
    p.fill(0); p.noStroke();
    p.ellipse(-12, 0, 10, 12); p.ellipse(12, 0, 10, 12);
    p.fill(255);
    p.ellipse(-8, -4, 4, 4); p.ellipse(16, -4, 4, 4);
  }
  p.pop();
}