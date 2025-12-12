let socket;
let myPet = { name: "", image: null, x: 250, y: 350 };
let friendPet = null; 
let allRooms = {}; 

let happiness = 5;
let lastInteractionTime = Date.now(); 

// ---  STATE VARIABLES ---
let furnitureList = []; 
let furnitureImages = {}; 
let wallColor = '#f0f8ff'; 
let isDeleteMode = false;  // Track if we are deleting items

let drawingSketch, roomSketch;
let bounceVal = 0;
let reactionTimer = 0;
let draggedFurniture = null;

// --- INITIALIZE ---
window.addEventListener('DOMContentLoaded', () => {
  setupSocket();
  setupUI();
  loadGameData();
});

function setupSocket() {
  if (location.hostname.includes('browsercircus')) {
    socket = io({ path: "/fatima/port-4220/socket.io" });
  } else {
    socket = io();
  }
  
  socket.on('update-room-list', (rooms) => { allRooms = rooms; updateFriendsUI(); });
  
  socket.on('join-room-success', (hostData) => {
    alert(`You are visiting ${hostData.hostName}!`);
    document.getElementById('room-title').innerText = `🏠 Visiting ${hostData.hostName}`;
    
    friendPet = { 
        name: hostData.hostName, 
        image: hostData.hostImage, 
        x: 250, y: 350, 
        socketId: null 
    };

    // Load Host's Room Data
    furnitureList = hostData.hostFurniture || [];
    wallColor = hostData.hostWallColor || '#f0f8ff'; // Sync Wall Color
    
    myPet.x = 100;
    
    document.getElementById('visit-friend-btn').classList.add('hidden');
    document.getElementById('go-home-btn').classList.remove('hidden');
    // Hide controls when visiting
    document.getElementById('add-furniture-btn').classList.add('hidden');
    document.getElementById('delete-mode-btn').classList.add('hidden');
    document.getElementById('emote-bar').classList.add('hidden'); // Note: This ID changed in HTML to .wall-color-picker, but keeping for safety
  });
  
  socket.on('visitor-arrived', (visitorData) => {
    friendPet = { ...visitorData, x: 100, y: 350 }; 
    alert(`${visitorData.name} has arrived!`);
    changeHappiness(1);
  });
  
  socket.on('visitor-left', () => { 
      friendPet = null; 
      alert("The visitor went home.");
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
    socket.emit('create-room', { 
        name: myPet.name, 
        image: myPet.image,
        furniture: furnitureList,
        wallColor: wallColor
    });
  };

  // ---  Wall Color Buttons ---
  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.onclick = (e) => {
      // Manage visual selection state
      document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
      e.target.classList.add('selected');

      // Only allow changing color if NOT visiting
      if(document.getElementById('go-home-btn').classList.contains('hidden')) {
        wallColor = e.target.dataset.color;
        saveGameData();
        socket.emit('update-room-data', { wallColor: wallColor });
      }
    };
  });

  document.getElementById('add-furniture-btn').onclick = () => document.getElementById('furniture-modal').classList.remove('hidden');
  
  // ---  Delete Mode Button ---
  const delBtn = document.getElementById('delete-mode-btn');
  delBtn.onclick = () => {
      isDeleteMode = !isDeleteMode; // Toggle mode
      if(isDeleteMode) {
          delBtn.innerText = "❌ Click to Delete";
          delBtn.classList.add('delete-active');
      } else {
          delBtn.innerText = "🗑️ Delete";
          delBtn.classList.remove('delete-active');
      }
  };

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
      socket.emit('update-room-data', { furniture: furnitureList });
      document.getElementById('furniture-modal').classList.add('hidden');
    };
  });

  document.getElementById('go-home-btn').onclick = () => {
    socket.emit('leave-room');
    friendPet = null;
    loadGameData(); // Reload my own data
    
    document.getElementById('room-title').innerText = "🏠 Home";
    document.getElementById('visit-friend-btn').classList.remove('hidden');
    document.getElementById('go-home-btn').classList.add('hidden');
    
    // Show controls again
    document.getElementById('add-furniture-btn').classList.remove('hidden');
    document.getElementById('delete-mode-btn').classList.remove('hidden');
    // document.getElementById('emote-bar').classList.remove('hidden'); // If needed
    
    socket.emit('create-room', { 
        name: myPet.name, 
        image: myPet.image,
        furniture: furnitureList,
        wallColor: wallColor
    });
  };
}

function updateFriendsUI() {
  const container = document.getElementById('friends-list-container');
  container.innerHTML = '';
  const friends = Object.values(allRooms).filter(r => r.socketId !== socket.id);

  if(friends.length === 0) container.innerHTML = '<p style="padding:10px; color:#999; text-align:center;">No friends online.</p>';

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
    };
    container.appendChild(row);
  });
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(id + '-screen').classList.remove('hidden');
}

function saveGameData() {
  localStorage.setItem('petRoomSave', JSON.stringify({ myPet, furnitureList, happiness, wallColor }));
}

function loadGameData() {
  const saved = localStorage.getItem('petRoomSave');
  if(saved) {
    const data = JSON.parse(saved);
    myPet = data.myPet;
    furnitureList = data.furnitureList;
    happiness = data.happiness;
    wallColor = data.wallColor || '#f0f8ff'; 
    
    if(myPet.image) {
      showScreen('room');
      initRoomCanvas();
      setTimeout(() => socket.emit('create-room', { 
          name: myPet.name, 
          image: myPet.image, 
          furniture: furnitureList,
          wallColor: wallColor
      }), 500);
    }
  }
}

// --- DRAWING CANVAS ---
function initDrawingCanvas() {
  if(drawingSketch) return;
  const s = (p) => {
    let currentTool = 'pen';
    
    p.setup = () => { 
      // Size relative to container to prevent overflow
      let container = document.getElementById('drawing-canvas-wrapper');
      let size = Math.min(container.offsetWidth, 350); 
      p.createCanvas(size, size); 
      p.clear(); 
      p.textAlign(p.CENTER, p.CENTER);
      
      let c = container.querySelector('canvas');
      if(c) {
        c.addEventListener('touchstart', (e)=>e.preventDefault(), {passive:false});
        c.addEventListener('touchmove', (e)=>e.preventDefault(), {passive:false});
      }
    };
    
    p.draw = () => {
      if (p.mouseIsPressed) {
        // ---  PEN TOOLS ---
        if (currentTool === 'pen') {
          p.stroke(0); p.strokeWeight(5); p.line(p.mouseX, p.mouseY, p.pmouseX, p.pmouseY);
        } 
        else if (currentTool === 'spray') {
          p.stroke('#8B4513'); p.strokeWeight(2);
          for(let i=0; i<10; i++) {
            let angle = p.random(p.TWO_PI);
            let r = p.random(15);
            p.point(p.mouseX + p.cos(angle)*r, p.mouseY + p.sin(angle)*r);
          }
        } 
        else if (currentTool === 'spotted') {
          p.noStroke(); p.fill('#FFD700'); 
          if(p.frameCount % 5 === 0) {
             p.ellipse(p.mouseX, p.mouseY, 15, 15);
          }
        } 
        else if (currentTool === 'eraser') {
          p.erase(); p.strokeWeight(20);
          p.line(p.mouseX, p.mouseY, p.pmouseX, p.pmouseY); p.noErase();
        }
      }
      drawCharacterEyes(p, p.width/2, p.height/2, 'happy');
    };
    
    document.querySelectorAll('.tool-btn').forEach(b => b.onclick = (e) => {
      if(e.target.dataset.tool === 'clear') p.clear(); 
      else {
          document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
          e.target.classList.add('active');
          currentTool = e.target.dataset.tool;
      }
    });
  };
  drawingSketch = new p5(s, 'drawing-canvas-wrapper');
}

// ---   ROOM CANVAS  ---
function initRoomCanvas() {
  if(roomSketch) return;
  const s = (p) => {
    let myPetImg, friendPetImg;
    
    p.setup = () => {
      //  DYNAMIC SIZE:
      let container = document.getElementById('game-canvas-wrapper');
      let w = container.offsetWidth;
      let h = container.offsetHeight;
      
      p.createCanvas(w, h); 
      p.imageMode(p.CENTER); p.textAlign(p.CENTER);
      
      if(myPet.image) myPetImg = p.loadImage(myPet.image);
      ['bed','table','plant','sofa'].forEach(k => furnitureImages[k] = p.loadImage(`furniture/${k}.png`));

      let c = container.querySelector('canvas');
      if(c) {
        c.addEventListener('touchstart', (e)=>e.preventDefault(), {passive:false});
        c.addEventListener('touchmove', (e)=>e.preventDefault(), {passive:false});
      }
    };

    // Handle Resize
    p.windowResized = () => {
      let container = document.getElementById('game-canvas-wrapper');
      if(container) p.resizeCanvas(container.offsetWidth, container.offsetHeight);
    };

    p.draw = () => {
      
      p.background(wallColor);
      
      //  DYNAMIC FLOOR: Always at the bottom
      let floorHeight = 100;
      let floorY = p.height - floorHeight;
      
      p.noStroke(); p.fill('#e1d2b8'); 
      p.rect(0, floorY, p.width, floorHeight);

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

      //  Position relative to floor
      let groundY = floorY + 40; 

      if(friendPet) {
        if(!friendPetImg && friendPet.image) friendPetImg = p.loadImage(friendPet.image);
        friendPet.y = groundY; // Update Y to match screen
        updatePet(p, friendPet, friendPetImg, false);
      }
      
      myPet.y = groundY; // Update Y to match screen
      updatePet(p, myPet, myPetImg, true);
      
      if(reactionTimer > 0) { p.textSize(30); p.text('❤️', myPet.x, myPet.y - 70); reactionTimer--; }
    };

    // ---  DELETE LOGIC ---
    p.mousePressed = () => {
      for(let i=furnitureList.length-1; i>=0; i--) {
        if(p.dist(p.mouseX, p.mouseY, furnitureList[i].x, furnitureList[i].y) < 40) {
          
          if(isDeleteMode) {
             // DELETE ITEM
             furnitureList.splice(i, 1);
             saveGameData();
             socket.emit('update-room-data', { furniture: furnitureList });
          } else {
             // DRAG ITEM
             draggedFurniture = furnitureList[i]; 
          }
          return;
        }
      }
      
      // Pet Interactions
      if(p.dist(p.mouseX, p.mouseY, myPet.x, myPet.y) < 50) {
        changeHappiness(1); 
        reactionTimer = 20; 
        bounceVal = 10; 
        lastInteractionTime = Date.now(); 
        saveGameData();
      }
    };
    
    p.mouseDragged = () => { if(draggedFurniture && !isDeleteMode) { draggedFurniture.x = p.mouseX; draggedFurniture.y = p.mouseY; }};
    
    p.mouseReleased = () => { 
        if(draggedFurniture) { 
            draggedFurniture = null; 
            saveGameData(); 
            socket.emit('update-room-data', { furniture: furnitureList });
        }
    };
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

  if(img && img.width > 1) p.image(img, 0, 0, 80, 80); 
  else { p.textSize(40); p.text("👻", 0, 0); }

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
  p.fill(255); p.stroke(0); p.strokeWeight(2);

  if (mood === 'tired') {
    p.noFill(); p.arc(-12, 5, 20, 10, p.PI, 0); p.arc(12, 5, 20, 10, p.PI, 0);
    p.noStroke(); p.fill(0); p.textSize(15); p.text("z", 25, -10);
  } else if (mood === 'bored') {
    p.fill(255); p.stroke(0); p.ellipse(-12, 0, 20, 26); p.ellipse(12, 0, 20, 26);
    p.fill(0); p.noStroke(); p.ellipse(-12, 2, 6, 6); p.ellipse(12, 2, 6, 6);
    p.fill(255); p.stroke(0); p.arc(-12, 0, 20, 26, p.PI, 0, p.CHORD); p.arc(12, 0, 20, 26, p.PI, 0, p.CHORD);
  } else if (mood === 'sad') {
    p.fill(255); p.stroke(0); p.ellipse(-12, 0, 20, 26); p.ellipse(12, 0, 20, 26);
    p.fill(0); p.noStroke(); p.ellipse(-12, 6, 8, 8); p.ellipse(12, 6, 8, 8);
    p.fill(255); p.ellipse(-10, 4, 3, 3); p.ellipse(14, 4, 3, 3);
  } else {
    p.fill(255); p.stroke(0); p.ellipse(-12, 0, 20, 26); p.ellipse(12, 0, 20, 26);
    p.fill(0); p.noStroke(); p.ellipse(-12, 0, 10, 12); p.ellipse(12, 0, 10, 12);
    p.fill(255); p.ellipse(-8, -4, 4, 4); p.ellipse(16, -4, 4, 4);
  }
  p.pop();
}