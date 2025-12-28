const socket = io();

// --------------------
// JOIN
// --------------------
const playerName = prompt("Enter your name") || "Guest";
socket.emit("joinRoom", { name: playerName });

// --------------------
// STATE
// --------------------
let currentQuestionIdx = 0;
let selectedIdx = null;
let submitted = false;

// --------------------
// QUESTION RECEIVED
// --------------------
socket.on("questionUpdate", ({ index, question }) => {
  currentQuestionIdx = index;
  selectedIdx = null;
  submitted = false;

  document.getElementById("q-text").innerText = question.q;
  document.getElementById("submitBtn").disabled = true;

  const grid = document.getElementById("options-grid");
  grid.innerHTML = "";

  question.o.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.innerText = opt;
    btn.className =
      "opt-btn bg-slate-800 hover:bg-slate-700 border border-slate-700 p-4 rounded-xl text-left font-semibold";

    btn.onclick = () => selectOption(i, btn);
    grid.appendChild(btn);
  });
});

// --------------------
// SELECT OPTION
// --------------------
function selectOption(idx, btn) {
  if (submitted) return;

  selectedIdx = idx;
  document.getElementById("submitBtn").disabled = false;

  document.querySelectorAll(".opt-btn").forEach(b => {
    b.classList.remove("ring-4", "ring-blue-500");
  });

  btn.classList.add("ring-4", "ring-blue-500");
}

// --------------------
// SUBMIT ANSWER
// --------------------
document.getElementById("submitBtn").onclick = () => {
  if (submitted || selectedIdx === null) return;

  submitted = true;
  document.getElementById("submitBtn").disabled = true;

  socket.emit("submitAnswer", {
    questionIdx: currentQuestionIdx,
    selectedIdx
  });

  document.querySelectorAll(".opt-btn").forEach(b => (b.disabled = true));
};

// --------------------
// TIMER UPDATE
// --------------------
socket.on("timerUpdate", time => {
  document.getElementById("timer-text").innerText = `${time}s`;
  document.getElementById("timer-bar").style.width = `${(time / 60) * 100}%`;

  if (time <= 15) {
    document.getElementById("timer-text").className =
      "text-4xl font-black text-red-500 animate-pulse";
  }
});

// --------------------
// LEADERBOARD UPDATE
// --------------------
socket.on("leaderboardUpdate", players => {
  const list = document.getElementById("rankings");
  list.innerHTML = "";

  Object.values(players)
    .sort((a, b) => b.score - a.score)
    .forEach((p, i) => {
      list.innerHTML += `
        <div class="flex justify-between bg-slate-800/60 p-3 rounded-lg">
          <span>${i + 1}. ${p.name}</span>
          <span class="text-blue-400 font-bold">${p.score}</span>
        </div>
      `;
    });
});

// --------------------
// ROUND WINNER (OPTIONAL)
// --------------------
socket.on("roundWinner", ({ name, points }) => {
  alert(`🏆 ${name} answered FIRST! +${points} points`);
});

// --------------------
// ROOM LOCK
// --------------------
socket.on("joinDenied", msg => alert(msg));
