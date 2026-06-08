let kampagnenChart = null;
let kapitelChart = null;

window.updateCampaignChart = function (wolvesCamp, sharksCamp) {
  const ctx = document.getElementById('kampagnenChart').getContext('2d');

  if (kampagnenChart) {
    kampagnenChart.data.datasets[0].data = [wolvesCamp, sharksCamp];
    kampagnenChart.update();
  } else {
    kampagnenChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Wolves', 'Sharks'],
        datasets: [{
          data: [wolvesCamp, sharksCamp],
          backgroundColor: ['#4444aa', '#aa4444'],
          borderColor: '#ffffff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { title: { display: true, text: 'Kampagnensiege (max. 14)', font: { size: 18 } } }
      }
    });
  }
};

// === Kapitel-Diagramm ===
window.updateChapterChart = function (wolvesKap, sharksKap) {
  const ctx = document.getElementById('kapitelChart').getContext('2d');

  if (kapitelChart) {
    kapitelChart.data.datasets[0].data = [wolvesKap, sharksKap];
    kapitelChart.update();
  } else {
    kapitelChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Wolves', 'Sharks'],
        datasets: [{
          data: [wolvesKap, sharksKap],
          backgroundColor: ['#4444aa', '#aa4444'],
          borderColor: '#ffffff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { title: { display: true, text: 'Kapitelsiege (max. 53)', font: { size: 18 } } }
      }
    });
  }
};

let punkteChart = null;

window.updatePointsChart = function (wolvesPts, sharksPts) {
  const ctx = document.getElementById('punkteChart').getContext('2d');

  if (punkteChart) {
    punkteChart.data.datasets[0].data = [wolvesPts, sharksPts];
    punkteChart.update();
  } else {
    punkteChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Wolves', 'Sharks'],
        datasets: [{
          data: [wolvesPts, sharksPts],
          backgroundColor: ['#4444aa', '#aa4444'],
          borderColor: '#ffffff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: {
            display: false
          },
          title: { 
            display: true, 
            text: 'Gesamtpunkte (max. 40.900)', 
            font: { size: 18 } 
          } 
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 40900
          }
        }
      }
    });
  }
};