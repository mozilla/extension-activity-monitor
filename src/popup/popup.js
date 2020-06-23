import Popup from '../lib/ext-popup.js';

window.addEventListener('DOMContentLoaded', async () => {
  const popup = new Popup();
  await popup.init();
});
