let page = 0;
let tiltEnabled = false;
let lastTiltTime = 0;
const tiltCooldown = 1000; // 1 second cooldown between page turns
const totalPages = 6; 

//  current page
function show() {
  document.querySelectorAll('.page').forEach((p, i) => {
    p.style.display = i === page ? 'block' : 'none';
  });
  document.getElementById('pageNumber').textContent = `Page ${page + 1} of ${totalPages}`;
}

// Next page
function next() {
  if (page < totalPages - 1) {
    page++;
    show();
  }
}

// Previous page
function prev() {
  if (page > 0) {
    page--;
    show();
  }
}

// Request orientation permission and enable tilt
async function enableTilt() {
  try {
    // For iOS 13+ devices that require permission
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== 'granted') {
        alert('Device orientation permission denied');
        return;
      }
    }
    
    // Add the event listener
    window.addEventListener("deviceorientation", tilt, true);
    tiltEnabled = true;
    
    // Updates button text
    const button = document.querySelector('button');
    if (button) {
      button.textContent = "✅ Tilt Enabled";
      button.style.background = "rgba(0, 128, 0, 0.9)";
    }
    
  } catch (error) {
    console.error('Error enabling tilt:', error);
    alert('Could not enable tilt control');
  }
}

// Handling device orientation
function tilt(event) {
  if (!tiltEnabled) return;
  
  const gamma = event.gamma; // Left-right tilt (-90 to 90)
  const now = Date.now();
  
  // Updating debug info if you have debug elements
  const gammaDebug = document.getElementById('gamma');
  const tiltDebug = document.getElementById('tilt');
  if (gammaDebug) gammaDebug.textContent = `gamma: ${Math.round(gamma)}`;
  
  // Prevent rapid page turns
  if (now - lastTiltTime < tiltCooldown) return;
  
  const tiltThreshold = 25; // Degrees of tilt needed
  
  if (gamma > tiltThreshold) {
    // Tilted right - next page
    next();
    lastTiltTime = now;
    if (tiltDebug) tiltDebug.textContent = "tilt: forward";
  } else if (gamma < -tiltThreshold) {
    // Tilted left - previous page
    prev();
    lastTiltTime = now;
    if (tiltDebug) tiltDebug.textContent = "tilt: backward";
  } else {
    if (tiltDebug) tiltDebug.textContent = "tilt: none";
  }
}

// Initialize on page load
window.onload = () => {
  show();
  
  // Auto-enable tilt for non-iOS devices
  if (typeof DeviceOrientationEvent.requestPermission !== 'function') {
    window.addEventListener("deviceorientation", tilt, true);
    tiltEnabled = true;
    const button = document.querySelector('button');
    if (button) {
      button.textContent = "✅ Tilt Enabled";
      button.style.background = "rgba(0, 128, 0, 0.9)";
    }
  }
};