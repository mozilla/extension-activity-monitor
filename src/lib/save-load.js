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

  async loadLogAsJSON(logFile) {
    const logStr = await this.readFile(logFile);
    return JSON.parse(logStr);
  },
};

export const save = {
  saveAsJSON() {
    return browser.runtime.sendMessage({
      requestTo: 'ext-monitor',
      requestType: 'saveLogs',
    });
  },
};
