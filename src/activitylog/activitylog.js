import ActivityLog from '../lib/ext-activitylog.js';

document.addEventListener('DOMContentLoaded', async () => {
  await new ActivityLog().init();
});
