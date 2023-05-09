const ball_radius = 10;
const ball_spawn_radius = 5;
const ball_padding = 5;
const max_spawn = 3;
const max_board = 5;
const colors = ["blue", "yellow", "green", "orange"]; //"purple","red",

var canvas = document.getElementById("canvas");
var react = canvas.getBoundingClientRect();
var ctx = canvas.getContext("2d");
var screen_scale = 1;
var spawn_pool = [];
var board = [[], [], []];
var loading = false;
var score = 0;

function init() {
  canvas.width = react.width;
  canvas.height = react.height;
  screen_scale = canvas.width / 100;
  console.log(canvas.width, canvas.height, screen_scale);
  canvas.addEventListener("click", click);
  ctx.font = screen_scale * 7 + "px comic sans ms";
  ctx.textBaseline = "top";
  fillSpawnPool();
  update();
}
init();

var lastType = -1;
function fillSpawnPool() {
  while (spawn_pool.length < max_spawn) {
    while (lastType === (lastType = Math.floor(Math.random() * colors.length)));
    spawn_pool.push(new Ball(Math.floor(lastType)));
  }
}

async function click(e) {
  if (loading) return;
  loading = true;
  var react = canvas.getBoundingClientRect();
  var x = e.clientX - react.left;
  var y = e.clientY - react.top;
  // console.log(x, y);
  if (y < react.height - max_board * (ball_radius * 2 + ball_padding) * react.width / 100) return loading = false;
  var col = Math.floor(x / (react.width / 3));
  if (col > 2) col = 2;
  if (col < 0) col = 0;
  console.log(col)
  if (board[col].length >= max_board) return loading = false;
  board[col].push(spawn_pool.shift());
  fillSpawnPool();
  await checkBall(col);
  update();
}

function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  var grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grd.addColorStop(0, '#8ED6FF');
  grd.addColorStop(1, '#004CB3');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "black";
  ctx.fillText("score: " + score, 2 * screen_scale, 2 * screen_scale);
  drawBoard();
  drawBalls();
  loading = false;
}

function drawBoard() {
  // draw line
  ctx.beginPath();
  ctx.strokeStyle = "black";
  for (let i = 1; i < 3; i++) {
    ctx.moveTo(canvas.width * i / 3, canvas.height);
    ctx.lineTo(canvas.width * i / 3, canvas.height - max_board * (ball_radius * 2 + ball_padding) * screen_scale);
  }
  ctx.stroke();
}

function drawBalls() {
  // draw spawn pool
  for (let i = 0; i < spawn_pool.length; i++) {
    spawn_pool[i].update(50, (ball_spawn_radius * 2 + ball_padding / 2) * (max_spawn - i), true);
  }
  // draw board
  var base_y = 200 - ball_radius - ball_padding;
  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board[i].length; j++) {
      board[i][j].update(100 * (i + 0.5) / 3,
        base_y - (ball_radius * 2 + ball_padding) * j);
    }
  }
}



function Ball(type) {
  this.type = type;

  this.update = function (x, y, spawn = false) {
    ctx.beginPath();
    ctx.fillStyle = colors[this.type];
    ctx.arc(x * screen_scale, y * screen_scale, (spawn ? ball_spawn_radius : ball_radius) * screen_scale, 0, 2 * Math.PI);
    ctx.fill();
  }
}

async function checkBall(col, row = 999) {
  row = Math.min(row, board[col].length - 1);
  var ball = board[col][row];
  if (!ball) return Promise.resolve();
  var popList = [];
  // if (col) {
  // 2, 5, 8
  if (ball.type === board[col]?.[row - 1]?.type) {
    popList.push([col, row - 1]);
  }
  if (ball.type === board[col - 1]?.[row]?.type) {
    popList.push([col - 1, row]);
  }
  if (ball.type === board[col + 1]?.[row]?.type) {
    popList.push([col + 1, row]);
  }
  // }
  score += [0, 2, 5, 8][popList.length];
  if (popList.length) {
    [[col, row], ...popList].forEach(([col, row]) => {
      board[col].splice(row, 1);
    });
    for ([col, row] of [[col, row], ...popList]) {
      await checkBall(col, row);
    }

  }
  return Promise.resolve();
}
