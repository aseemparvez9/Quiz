const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));
let questionLocked = false;
let winnerSocketId = null;
let quizEnded = false;


const QUIZ_DATA = require("./quiz-data");

let players = {};
let quizState = {
  currentIdx: 0,
  timer: 60,
  interval: null
};

io.on("connection", socket => {
  console.log("Connected:", socket.id);

  socket.on("joinRoom", ({ name }) => {
  players[socket.id] = {
    id: socket.id,
    name,
    score: 0,
    answers: {}   // ✅ VERY IMPORTANT
  };

  socket.emit("joined");
  io.emit("leaderboardUpdate", players);
});


  socket.on("startQuiz", () => {
    quizState.currentIdx = 0;
    startQuestion();
  });

  socket.on("nextQuestion", () => {
  quizState.currentIdx++;

  if (quizState.currentIdx < QUIZ_DATA.length) {
    startQuestion();
  } else {
    endQuiz();
  }
});


  socket.on("submitAnswer", ({ questionIdx, selectedIdx }) => {
  const player = players[socket.id];
  //if (!player) return;
  if (!player) {
  console.log("⚠️ Player not found:", socket.id);
  return;
}
  if (quizEnded) return;

  // Prevent multiple submissions
  if (player.answers[questionIdx] !== undefined) return;

  player.answers[questionIdx] = selectedIdx;

  const correctIdx = QUIZ_DATA[questionIdx].a;

  if (selectedIdx === correctIdx) {
    const points = 1000 + quizState.timer * 10;
    player.score += points;

    console.log(`✅ ${player.name} +${points}`);

    io.emit("leaderboardUpdate", players);
  }
});

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("leaderboardUpdate", players);
  });
});

function startQuestion() {
  quizState.timer = 60;
  questionLocked = false;
  winnerSocketId = null;

  io.emit("questionUpdate", {
    index: quizState.currentIdx,
    question: QUIZ_DATA[quizState.currentIdx]
  });

  clearInterval(quizState.interval);
  quizState.interval = setInterval(() => {
    quizState.timer--;
    io.emit("timerUpdate", quizState.timer);
    if (quizState.timer <= 0) clearInterval(quizState.interval);
  }, 1000);
}

function endQuiz() {
  clearInterval(quizState.interval);

  console.log("🏁 Quiz completed");

  io.emit("quizEnded", {
    players,
    totalQuestions: QUIZ_DATA.length
  });
}

function endQuiz() {
  quizEnded = true;
  clearInterval(quizState.interval);

  io.emit("quizEnded", {
    players,
    totalQuestions: QUIZ_DATA.length
  });
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () =>
  console.log("Server running http://localhost:3000")
);
