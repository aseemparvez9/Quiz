const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));
let questionLocked = false;
let winnerSocketId = null;

const QUIZ_DATA = [
  { q: "Capital of France?", o: ["London", "Berlin", "Paris", "Rome"], a: 2 },
  { q: "2 + 2 = ?", o: ["3", "4", "5", "6"], a: 1 },
  { q: "Red Planet?", o: ["Earth", "Mars", "Jupiter", "Venus"], a: 1 }
];

let players = {};
let quizState = {
  currentIdx: 0,
  timer: 60,
  interval: null
};

io.on("connection", socket => {
  console.log("Connected:", socket.id);

  socket.on("joinRoom", ({ name }) => {
    players[socket.id] = { name, score: 0, answers: {} };
    io.emit("leaderboardUpdate", players);
  });

  socket.on("startQuiz", () => {
    quizState.currentIdx = 0;
    startQuestion();
  });

  socket.on("nextQuestion", () => {
    quizState.currentIdx++;
    if (quizState.currentIdx >= QUIZ_DATA.length) {
      io.emit("quizEnded");
      return;
    }
    startQuestion();
  });

  socket.on("submitAnswer", ({ questionIdx, selectedIdx }) => {
  const player = players[socket.id];
  if (!player) return;

  // Already answered
  if (player.answers[questionIdx] !== undefined) return;

  player.answers[questionIdx] = selectedIdx;

  // If winner already decided, ignore
  if (questionLocked) return;

  const correctIdx = QUIZ_DATA[questionIdx].a;

  if (selectedIdx === correctIdx) {
    questionLocked = true;
    winnerSocketId = socket.id;

    const points = 1000 + quizState.timer * 10;
    player.score += points;

    console.log(`🥇 WINNER: ${player.name} +${points}`);

    io.emit("roundWinner", {
      name: player.name,
      points
    });

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

const PORT = process.env.PORT || 3000;
http.listen(PORT, () =>
  console.log("Server running http://localhost:3000")
);
