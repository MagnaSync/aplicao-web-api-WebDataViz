/**
 * MagnaSync — Telemetry Dashboard Interactive Scripts
 */

document.addEventListener('DOMContentLoaded', () => {
  // Time filter buttons
  const timeButtons = document.querySelectorAll('.time-btn');
  timeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      timeButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Simulated live counter for telemetry collection
  const liveTimer = document.getElementById('live-timer');
  let seconds = 4;

  if (liveTimer) {
    setInterval(() => {
      seconds = (seconds % 5) + 1;
      liveTimer.textContent = `${seconds}s`;
    }, 1000);
  }

  // Equipment selector notification
  const unitSelector = document.getElementById('unit-selector');
  if (unitSelector) {
    unitSelector.addEventListener('change', (e) => {
      const selectedName = e.target.options[e.target.selectedIndex].text;
      const unitTitle = document.querySelector('.unit-badge strong');
      if (unitTitle) {
        unitTitle.textContent = selectedName;
      }
    });
  }
});
