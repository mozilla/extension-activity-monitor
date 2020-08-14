import { load, save } from '../src/lib/save-load';

describe('load file functionalities', () => {
  test('load data from a file', async () => {
    const logs = [{ prop: 'log' }];
    const file = JSON.stringify(logs);
    const blob = new Blob([file], {
      type: 'application/json',
    });

    const loadedLogs = load.loadLogAsJSON(blob);
    await expect(loadedLogs).resolves.toMatchObject(logs);
  });

  test('throws error while reading file', async () => {
    const readAsTextFn = jest.spyOn(FileReader.prototype, 'readAsText');

    const file = JSON.stringify([{ prop: 'log' }]);
    const blob = new Blob([file], {
      type: 'application/json',
    });

    readAsTextFn.mockImplementationOnce(function () {
      jest
        .spyOn(this, 'error', 'get')
        .mockReturnValue(new DOMException('read-error'));
      this.onerror();
    });

    const loadedLogs = load.loadLogAsJSON(blob);
    await expect(loadedLogs).rejects.toThrowError('read-error');

    readAsTextFn.mockRestore();
  });
});

describe('save file functionalities', () => {
  test('saveAsJSON function should create a blob url and send a message to background', async () => {
    const sendMessage = jest.fn();

    window.browser = {
      runtime: { sendMessage },
    };

    let listener;
    sendMessage.mockImplementation((callback) => {
      listener = callback;
    });

    const log = [{ prop1: 'log1' }];
    await save.saveAsJSON(log);

    expect(sendMessage).toHaveBeenCalled();
    expect(listener.requestType).toBe('saveLogs');
    expect(listener.requestTo).toBe('ext-monitor');
  });
});
