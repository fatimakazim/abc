let d;
let circleColor;

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("p5-canvas-container");

  d = min(width, height) / 4;
  circleColor = color(255, 105, 180); // hot pink
}

function draw() {
  background(255, 182, 193); // light pink 

  fill(circleColor);

  // 4 circles
  circle(width * 0.25, height * 0.25, d);
  circle(width * 0.75, height * 0.25, d);
  circle(width * 0.25, height * 0.75, d);
  circle(width * 0.75, height * 0.75, d);
}


function touchStarted() {
  for (let t of touches) {
    //  if touch is inside any circle
    if (dist(t.x, t.y, width * 0.25, height * 0.25) < d/2 ||
        dist(t.x, t.y, width * 0.75, height * 0.25) < d/2 ||
        dist(t.x, t.y, width * 0.25, height * 0.75) < d/2 ||
        dist(t.x, t.y, width * 0.75, height * 0.75) < d/2) {
      circleColor = color(random(255), random(255), random(255)); // change color
    }
  }
  return false; // stop screen scrolling
}

function touchMoved() {}
function touchEnded() {}

function windowResized(){
  resizeCanvas(windowWidth, windowHeight);
  d = min(width, height) / 4; // resize circles
}
