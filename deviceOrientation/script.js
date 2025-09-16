let page = 0;
let tiltOn = false;

// Show page
function show() {
  document.querySelectorAll('.page').forEach((p, i) => {
    p.style.display = i === page ? 'block' : 'none';
  });
  document.getElementById('pageNumber').textContent = `Page ${page + 1} of 6`;
}

// Next page
function next() {
  if (page < 5) { page++; show(); }
}

// Previous page  
function prev() {
  if (page > 0) { page--; show(); }
}

// Enable tilt
function enableTilt() {
  window.addEventListener("deviceorientation", tilt);
  tiltOn = true;
  document.querySelector('button').textContent = "Tilt On ✓";
}

// Handle tilt
function tilt(e) {
  if (!tiltOn) return;
  if (e.gamma > 25) next();
  if (e.gamma < -25) prev();
}

// Start
window.onload = () => show();