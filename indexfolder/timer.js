const nextLan = new Date("2026-06-13T09:00:00"); // Beispieltermin
const countdownEl = document.getElementById("countdown");

function updateCountdown() {
  const now = new Date();
  const diff = nextLan - now;
  if (diff <= 0) {
    countdownEl.textContent = "LAN läuft!";
    return;
  }

  const days = Math.floor(diff / (1000*60*60*24));
  const hours = Math.floor((diff / (1000*60*60)) % 24);
  const mins = Math.floor((diff / (1000*60)) % 60);
  const secs = Math.floor((diff / 1000) % 60);
  countdownEl.textContent = `${days} Tage ${hours} Stunden ${mins.toString().padStart(2,"0")} Minuten ${secs.toString().padStart(2,"0")} Sekunden`;
}

setInterval(updateCountdown, 1000);
updateCountdown();