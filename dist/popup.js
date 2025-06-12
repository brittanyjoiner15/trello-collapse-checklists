document.addEventListener('DOMContentLoaded', () => {
  const closeButton = document.getElementById('close-popup');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      window.close();
    });
  }
});
