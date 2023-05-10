const ball_radius = 10;
const ball_spawn_radius = 5;
const ball_padding = 5;
const base_y = 200 - ball_radius - ball_padding;
const max_spawn = 3;
const click_gravity = 1;
const fall_gravity = 0.1;
const max_board = 5;
const FPS = 60;
const showFPS = false;
const colors = ["#FFB81D", "#5AB6E2", "#8C46B9", "#4ED072", "#FF6A50"];
const state = {
  SPAWN: 0,
  MOVING: 1,
  IDLE: 2,
  POPING: 3,
  MARKED: -1,
}

var canvas = document.getElementById("canvas");
var react = canvas.getBoundingClientRect();
var ctx = canvas.getContext("2d");
var rainbowParade = 0;
var screen_scale = 1;
var lastCalledTime;
var spawn_pool = [];
var poping_pool = [];
var board = [[], [], []];
var colTrigger = [0, 0, 0];
var loading = false;
var animating = false;
var score = 0;
var highscore = 0;

function init() {
  canvas.width = react.width;
  canvas.height = react.height;
  screen_scale = canvas.width / 100;
  // console.log(canvas.width, canvas.height, screen_scale);
  canvas.addEventListener("click", click);
  highscore = loadScore();
  ctx.font = screen_scale * 7 + "px comic sans ms";
  ctx.textBaseline = "top";
  fillSpawnPool();
  setInterval(update, 1000 / FPS);
}

var lastType = -1;
function fillSpawnPool() {
  for (let i = 0; i < spawn_pool.length; i++) {
    spawn_pool[i].set(state.SPAWN, i);
  }
  while (spawn_pool.length < max_spawn) {
    while (lastType === (lastType = Math.floor(Math.random() * colors.length)));
    spawn_pool.push(new Ball(lastType, spawn_pool.length));
  }
}

async function click(e) {
  // if (loading) return;
  loading = true;
  var react = canvas.getBoundingClientRect();
  var x = e.clientX - react.left;
  var y = e.clientY - react.top;
  // console.log(x, y);
  if (y < 10 * screen_scale && x > 90 * screen_scale) {
    saveScore();
    window.location.reload();
    return;
  }
  if (y < react.height - max_board * (ball_radius * 2 + ball_padding) * react.width / 100) return loading = false;
  var col = Math.floor(x / (react.width / 3));
  if (col > 2) col = 2;
  if (col < 0) col = 0;
  // console.log(col)
  colTrigger[col] = 1;
  if (board[col].length >= max_board) return loading = false;
  spawn_pool[0].set(state.MOVING, col, board[col].length);
  board[col].push(spawn_pool.shift());
  // console.log(board[col], spawn_pool)
  fillSpawnPool();
  // await checkBall(col);
  // update();
}

async function update() {
  // console.log(spawn_pool, board, poping_pool)
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  animating = false;
  drawBG();
  drawBalls();
  if (!animating && loading)
    await checkBalls();
  loading = animating;
}

function drawBG() {
  var grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grd.addColorStop(0, '#8ED6FF');
  grd.addColorStop(1, '#004CB3');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "black";
  ctx.fillText("score: " + score, 2 * screen_scale, 7 * screen_scale);
  ctx.scale(0.5, 0.5);
  ctx.fillText("highscore: " + highscore, 4 * screen_scale, 6 * screen_scale);
  ctx.scale(2, 2);

  ctx.fillStyle = "black";
  ctx.fillText("↻", 92 * screen_scale, 2 * screen_scale);

  if (showFPS) {
    var fps = 0;
    if (!lastCalledTime) {
      lastCalledTime = Date.now();
      fps = 0;
    }
    else {
      var delta = (Date.now() - lastCalledTime) / 1000;
      lastCalledTime = Date.now();
      fps = 1 / delta;
    }
    ctx.scale(0.5, 0.5);
    ctx.fillText(Math.round(fps), 4 * screen_scale, 20 * screen_scale);
    ctx.scale(2, 2);
  }

  // fill col trigger
  ctx.scale(1, 4)
  for (let i = 0; i < 3; i++) {
    grd = ctx.createRadialGradient(canvas.width * (i + 0.5) / 3, canvas.height / 4, 0, canvas.width * (i + 0.5) / 3, canvas.height / 4, 30 * screen_scale);

    grd.addColorStop(0, `rgba(255, 255, 255, ${colTrigger[i] * 0.3})`);
    grd.addColorStop(1, `rgba(255, 255, 255, 0)`);
    if (board[i].length >= max_board) {
      grd.addColorStop(0.99, `rgba(0, 0, 0, 0)`);
      grd.addColorStop(0, `rgba(0, 0, 0, 0.5)`);
    }
    ctx.fillStyle = grd;
    ctx.fillRect(canvas.width * i / 3, 0, canvas.width / 3, canvas.height / 4);
    colTrigger[i] -= 0.05;
    if (colTrigger[i] < 0) colTrigger[i] = 0;
  }
  ctx.scale(1, 0.25)

  // draw line
  ctx.beginPath();
  ctx.lineWidth = 1 * screen_scale;
  grd = ctx.createLinearGradient(0, 50 * screen_scale, 0, 220 * screen_scale);
  ["red", "orange", "yellow", "lime", "green", "deepskyblue", "blue", "purple"].forEach((color, index) => {
    grd.addColorStop((8 - index / 8 + rainbowParade / 100) % 1, color);
  });
  rainbowParade = (rainbowParade + 0.2) % 100;
  ctx.strokeStyle = grd;
  for (let i = 1; i < 3; i++) {
    ctx.moveTo(canvas.width * i / 3, canvas.height);
    ctx.lineTo(canvas.width * i / 3, canvas.height - max_board * (ball_radius * 2 + ball_padding) * screen_scale);
  }
  ctx.stroke();
}

function drawBalls() {
  // draw spawn pool
  for (let i = 0; i < spawn_pool.length; i++) {
    spawn_pool[i].update();
  }
  // draw board
  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board[i].length; j++) {
      board[i][j].update();
    }
  }
  // draw poping
  for (let i = 0; i < poping_pool.length; i++) {
    poping_pool[i].update();
  }
}

async function checkBalls() {
  console.log('check', spawn_pool.length, board.reduce((a, b) => a + b.length, 0), poping_pool.length)
  // clear poping pool
  poping_pool = poping_pool.filter(ball => ball.state !== state.MARKED);

  var combo = [];
  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board[i].length; j++) {
      let _ = await board[i][j].check();
      if (_) combo.push([0, 0, 2, 5, 10, 20][_]);
    }
  }
  score += combo.reduce((a, b) => a + b, 0);
  if (combo.length) {
    // for (let i = 0; i < board.length; i++) {
    //   for(let j = 0; j < board[i].length; j++) {

    // }
    board = board.map(col => col.filter(ball => ball.state !== state.POPING))
    board.map(col => {
      col.map((ball, index) => {
        ball.set(state.MOVING, ball.col, index);
      })
      return col;
    });
    animating = true;
  }
  return Promise.resolve();
}



class Ball {
  constructor(type, index) {
    this.type = type;
    this.x = 50;
    this.y = -10;
    this.size = 0;
    this.alpha = 1;
    this.gravity = click_gravity;
    this.speed = 0;
    this.col = index;
    this.row = -1;
    this.target = {
      x: 50,
      y: (ball_spawn_radius * 2 + ball_padding / 2) * (max_spawn - index),
      size: ball_spawn_radius,
    }
    this.state = state.SPAWN;
  }

  set(newState, col, row) {
    this.state = newState;
    this.col = col ?? this.col;
    this.row = row ?? this.row;
    if (newState === state.SPAWN) {
      this.target.y = (this.size * 2 + ball_padding / 2) * (max_spawn - col);
    } else if (newState === state.IDLE) {
      this.x = this.target.x;
      this.y = this.target.y;
      this.size = this.target.size;
      this.speed = 0;
      this.gravity = fall_gravity;
    } else if (newState === state.MOVING) {
      this.target.y = base_y - (ball_radius * 2 + ball_padding) * row;
      this.target.x = 100 * (col + 0.5) / 3;
      this.target.size = ball_radius;
    } else if (newState == state.POPING) {
      this.target.size = ball_radius * 3;
    }
    return this;
  }

  async check() {
    var strike = 0;
    var found = false;
    if (this.state !== state.IDLE) return Promise.resolve(0);
    this.state = state.MARKED;
    for (let [col, row] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      strike += await checkForiegn(this.col + col, this.row + row, this.type);
    }
    if (found) {
      this.set(state.POPING);
      poping_pool.push(this);
      strike++;
    }
    else this.state = state.IDLE;

    return Promise.resolve(strike);

    async function checkForiegn(col, row, type) {
      if (board[col]?.[row]?.type === type) {
        found = true;
        return board[col][row].check();
      }
      return Promise.resolve(0);
    }
  }


  update() {
    this.calculatePosition();
    if (this.state === state.MOVING || this.state === state.POPING) animating = true;
    ctx.beginPath();
    ctx.fillStyle = colors[this.type];
    ctx.arc(this.x * screen_scale, this.y * screen_scale, this.size * screen_scale, 0, 2 * Math.PI);
    ctx.globalAlpha = this.alpha;
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  calculatePosition() {
    // console.log(this.target)
    if (this.state === state.IDLE) return;
    if (this.state === state.SPAWN || this.state === state.MOVING) {
      if (this.x !== this.target.x) {
        if (Math.abs(this.x - this.target.x) < this.gravity) this.x = this.target.x;
        else this.x += (this.target.x - this.x) / 5;
      }
      if (this.size !== this.target.size) {
        this.size += click_gravity / 2;
        if (this.size >= this.target.size) this.size = this.target.size;
      }
      if (this.y <= this.target.y) {
        this.speed += this.gravity;
        this.y += this.speed;
        if (this.y >= this.target.y) {
          this.y = this.target.y;
          this.speed = 0;
          if (this.state === state.MOVING) {
            // console.log('stop')
            this.set(state.IDLE);
          }
        }
      } else if (this.state === state.MOVING) {
        this.set(state.IDLE);
      }
    } else if (this.state === state.POPING) {
      this.size += (this.target.size - this.size) / 5;
      this.alpha -= 0.1;
      if (this.alpha <= 0) {
        this.alpha = 0;
        return this.state = state.MARKED;
      }
    }
  }
}

function saveScore() {
  highscore = Math.max(score, highscore);
  var d = new Date();
  d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000));
  var expires = "expires=" + d.toUTCString();
  document.cookie = "score=" + highscore + ";" + expires + ";path=/";
}

function loadScore() {
  var name = "score=";
  var ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    var c = ca[i].trim();
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  return 0;
}

init();