document.querySelectorAll("input[type='number']").forEach(input => {
  input.addEventListener("input", window.updateAll);
});

window.addEventListener("DOMContentLoaded", () => {
  window.updateAll();
});