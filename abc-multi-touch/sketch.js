function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("p5-canvas-container");
  background(255, 182, 193); // light pink
}

function draw() {
  background(255, 182, 193);

  fill(255, 105, 180); // hot pink
  circle(width/2, height/2, 100); // static circle in center
}
