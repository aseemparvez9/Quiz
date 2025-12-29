const socket = io();
let currentIdx = 0;

document.getElementById("startQuizBtn").onclick = () => {
  socket.emit("startQuiz");
};

document.getElementById("nextQuestionBtn").onclick = () => {
  socket.emit("nextQuestion");
};

socket.on("questionUpdate", ({ index, question }) => {
  currentIdx = index;
  document.getElementById("q-text").innerText = question.q;
});

socket.on("timerUpdate", time => {
  document.getElementById("timer-text").innerText = time;
});

socket.on("leaderboardUpdate", players => {
  const list = document.getElementById("rankings");
  list.innerHTML = "";
  Object.values(players)
    .sort((a,b)=>b.score-a.score)
    .forEach(p => {
      list.innerHTML += `<div>${p.name}: ${p.score}</div>`;
    });
});
socket.on("quizEnded", ({ players }) => {
  document.getElementById("quiz-screen").classList.add("hidden");
  document.getElementById("end-screen").classList.remove("hidden");

  const board = document.getElementById("final-leaderboard");
  board.innerHTML = "";

  Object.values(players)
    .sort((a, b) => b.score - a.score)
    .forEach((p, i) => {
      board.innerHTML += `
        <div class="flex justify-between bg-slate-800 p-4 rounded-xl">
          <span>${i + 1}. ${p.name}</span>
          <span class="font-bold text-green-400">${p.score}</span>
        </div>
      `;
    });
});
