const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

const QUIZ_DATA = require("./quiz-data");

let players = {};
let quizEnded = false;

let quizState = {
  currentIdx: 0,
  timer: 30, // reduced to 30 seconds
  interval: null
};

io.on("connection", socket => {
  console.log("Connected:", socket.id);

  socket.on("joinRoom", ({ name }) => {
    players[socket.id] = { id: socket.id, name, score: 0, answers: {} };
    socket.emit("joined");
    io.emit("leaderboardUpdate", players);
  });

  socket.on("startQuiz", () => {
    quizEnded = false;
    quizState.currentIdx = 0;
    startQuestion();
  });

  socket.on("nextQuestion", () => {
    quizState.currentIdx++;
    if (quizState.currentIdx < QUIZ_DATA.length) startQuestion();
    else endQuiz();
  });

  socket.on("submitAnswer", ({ questionIdx, selectedIdx }) => {
    const player = players[socket.id];
    if (!player || quizEnded) return;
    if (player.answers[questionIdx] !== undefined) return;

    player.answers[questionIdx] = selectedIdx;

    const correctIdx = QUIZ_DATA[questionIdx].a;
    if (selectedIdx === correctIdx) {
      const points = 1000 + quizState.timer * 10;
      player.score += points;
    }

    io.emit("leaderboardUpdate", players);
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("leaderboardUpdate", players);
  });
});

function startQuestion() {
  quizState.timer = 30; // 30 seconds

  Object.values(players).forEach(p => (p.answers = {}));

  io.emit("questionUpdate", {
    index: quizState.currentIdx,
    question: QUIZ_DATA[quizState.currentIdx]
  });

  clearInterval(quizState.interval);
  quizState.interval = setInterval(() => {
    quizState.timer--;
    io.emit("timerUpdate", quizState.timer);

    if (quizState.timer <= 0) {
      clearInterval(quizState.interval);
      io.emit("revealAnswer", { correctIdx: QUIZ_DATA[quizState.currentIdx].a });

      // automatically move to next question after 3 seconds
      setTimeout(() => {
        quizState.currentIdx++;
        if (quizState.currentIdx < QUIZ_DATA.length) startQuestion();
        else endQuiz();
      }, 3000);
    }
  }, 1000);
}

function endQuiz() {
  quizEnded = true;
  clearInterval(quizState.interval);
  io.emit("quizEnded", { players });
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () =>
  console.log("🚀 Server running http://localhost:3000")
);
