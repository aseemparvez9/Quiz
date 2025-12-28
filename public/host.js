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
