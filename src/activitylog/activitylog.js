import ActivityLog from '../lib/ext-activitylog.js';

window.addEventListener('DOMContentLoaded', async () => {
  await new ActivityLog().init();
});
