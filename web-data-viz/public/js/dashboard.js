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
