export const load = {
  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.onerror = () => {
        reject(reader.error);
      };
      reader.readAsText(file);
    });
  },

  async loadLogAsText(logFile) {
    return await this.readFile(logFile);
  },
};

export const save = {
  async downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    let downloadId = null;
    let listener;

    const downloadDonePromise = new Promise((resolve, reject) => {
      listener = (result) => {
        if (result.state.current === 'complete' && result.id === downloadId) {
          resolve();
        }
        if (result.error) {
          reject(new Error(result.error));
        }
      };

      browser.downloads.onChanged.addListener(listener);
    });

    try {
      downloadId = await browser.downloads.download({
        url,
        filename,
      });
      return await downloadDonePromise;
    } finally {
      URL.revokeObjectURL(url);
      browser.downloads.onChanged.removeListener(listener);
    }
  },

  saveAsJSON(logs) {
    const blob = new Blob([JSON.stringify(logs)], {
      type: 'application/json',
    });

    return this.downloadFile(blob, 'activitylogs.json');
  },
};
