async function init() {
  async function getAllExtensions() {
    const extensions = await browser.management.getAll();
    return extensions.filter((extension) => extension.type !== 'theme');
  }

  async function areExtsBeingMonitored() {
    const { status } = await browser.runtime.sendMessage({
      getMonitoringStatus: true,
    });
    return status || false;
  }

  async function initializeMonitorAll(extensions) {
    await browser.runtime.sendMessage({
      extStartMonitorAll: extensions,
    });
    window.close();
  }

  async function stopMonitorAll() {
    await browser.runtime.sendMessage({
      extStopMonitorAll: true,
    });
    window.close();
  }

  async function viewActivityLogs() {
    browser.tabs.create({
      url: `${browser.runtime.getURL('../activitylog/activitylog.html')}`,
    });
    window.close();
  }

  const extensions = await getAllExtensions();
  const startMonitorAllBtn = document.getElementById('startMonitorBtn');
  const stopMonitorAllBtn = document.getElementById('stopMonitorBtn');
  const viewActivityLogBtn = document.getElementById('actLogPage');
  const monitorStatusText = document.getElementById('monitorStatus');

  startMonitorAllBtn.addEventListener('click', () => {
    initializeMonitorAll(extensions);
  });

  stopMonitorAllBtn.addEventListener('click', () => {
    stopMonitorAll(extensions);
  });

  viewActivityLogBtn.addEventListener('click', () => {
    viewActivityLogs();
  });

  const status = await areExtsBeingMonitored();

  if (status) {
    monitorStatusText.textContent = 'Extensions are being monitored';
    monitorStatusText.classList.add('green');

    startMonitorAllBtn.classList.add('disabled');
    startMonitorAllBtn.setAttribute('disabled', 'disabled');

    stopMonitorAllBtn.removeAttribute('disabled');
  } else {
    monitorStatusText.textContent = 'No extensions being monitored';
    monitorStatusText.classList.add('red');

    stopMonitorAllBtn.classList.add('disabled');
    stopMonitorAllBtn.setAttribute('disabled', 'disabled');

    startMonitorAllBtn.removeAttribute('disabled');
  }
}

window.addEventListener('DOMContentLoaded', init);
