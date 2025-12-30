const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

const QUIZ_DATA = require("./quiz-data");

/* ---------------- GAME STATE ---------------- */
let players = {};
let quizEnded = false;

let quizState = {
  currentIdx: 0,
  timer: 60,
  interval: null
};

/* ---------------- SOCKET ---------------- */
io.on("connection", socket => {
  console.log("Connected:", socket.id);

  /* JOIN */
  socket.on("joinRoom", ({ name }) => {
    players[socket.id] = {
      id: socket.id,
      name,
      score: 0,
      answers: {}
    };

    socket.emit("joined");
    io.emit("leaderboardUpdate", players);
  });

  /* START QUIZ */
  socket.on("startQuiz", () => {
    quizEnded = false;
    quizState.currentIdx = 0;
    startQuestion();
  });

  /* NEXT QUESTION */
  socket.on("nextQuestion", () => {
    quizState.currentIdx++;

    if (quizState.currentIdx < QUIZ_DATA.length) {
      startQuestion();
    } else {
      endQuiz();
    }
  });

  /* SUBMIT ANSWER */
  socket.on("submitAnswer", ({ questionIdx, selectedIdx }) => {
    const player = players[socket.id];
    if (!player || quizEnded) return;

    // prevent double submit
    if (player.answers[questionIdx] !== undefined) return;

    player.answers[questionIdx] = selectedIdx;

    const correctIdx = QUIZ_DATA[questionIdx].a;

    if (selectedIdx === correctIdx) {
      const points = 1000 + quizState.timer * 10;
      player.score += points;
      console.log(`✅ ${player.name} +${points}`);
    }

    // ✅ ALWAYS update leaderboard
    io.emit("leaderboardUpdate", players);
  });

  /* DISCONNECT */
  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("leaderboardUpdate", players);
  });
});

/* ---------------- HELPERS ---------------- */
function startQuestion() {
  quizState.timer = 60;

  // ✅ RESET answers for new question
  Object.values(players).forEach(p => {
    p.answers = {};
  });

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
    }
  }, 1000);
}

function endQuiz() {
  quizEnded = true;
  clearInterval(quizState.interval);

  console.log("🏁 Quiz completed");

  io.emit("quizEnded", {
    players,
    totalQuestions: QUIZ_DATA.length
  });
}

/* ---------------- SERVER ---------------- */
const PORT = process.env.PORT || 3000;
http.listen(PORT, () =>
  console.log("🚀 Server running http://localhost:3000")
);
