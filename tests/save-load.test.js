import { load, save } from '../src/lib/save-load';

describe('load file functionalities', () => {
  test('load data from a file', async () => {
    const file = JSON.stringify([{ prop: 'log' }]);
    const blob = new Blob([file], {
      type: 'application/json',
    });

    const loadedLogs = load.loadLogAsText(blob);
    await expect(loadedLogs).resolves.toBe(file);
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

    const loadedLogs = load.loadLogAsText(blob);
    await expect(loadedLogs).rejects.toThrowError('read-error');

    readAsTextFn.mockRestore();
  });
});

describe('save file functionalities', () => {
  test('Save saveAsJSON should create a blob url and download it', async () => {
    const downloadFileFn = jest.spyOn(save, 'downloadFile');

    const createObjectURL = jest.fn();
    const revokeObjectURL = jest.fn();
    window.URL = { createObjectURL, revokeObjectURL };

    const download = jest.fn();
    const addListener = jest.fn();
    const removeListener = jest.fn();

    window.browser = {
      downloads: {
        download,
        onChanged: { addListener, removeListener },
      },
    };

    createObjectURL.mockReturnValue('fake-blob-url');

    let listener;
    addListener.mockImplementation((callback) => {
      listener = callback;
    });

    download.mockImplementation(() => {
      const id = 123;
      setTimeout(() => {
        listener({
          state: { current: 'in_progress' },
          id,
        });
        listener({
          state: { current: 'complete' },
          id,
        });
      }, 0);
      return Promise.resolve(id);
    });

    const log = [{ prop1: 'log1' }];
    await save.saveAsJSON(log);

    const blob = downloadFileFn.mock.calls[0][0];
    const blobContent = load.readFile(blob);

    await expect(blobContent).resolves.toBe(JSON.stringify(log));

    expect(downloadFileFn).toHaveBeenCalledTimes(1);
    expect(download).toHaveBeenCalledTimes(1);
    expect(download).toHaveBeenCalledWith({
      url: 'fake-blob-url',
      filename: 'activitylogs.json',
    });

    expect(addListener).toHaveBeenCalledTimes(1);
    expect(addListener).toHaveBeenCalledWith(listener);

    expect(removeListener).toHaveBeenCalledTimes(1);
    expect(removeListener).toHaveBeenCalledWith(listener);

    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('fake-blob-url');

    downloadFileFn.mockRestore();
  });

  test('Save saveAsJSON should return error message if error is encountered', async () => {
    const downloadFileFn = jest.spyOn(save, 'downloadFile');

    const createObjectURL = jest.fn();
    const revokeObjectURL = jest.fn();
    window.URL = { createObjectURL, revokeObjectURL };

    const download = jest.fn();
    const addListener = jest.fn();
    const removeListener = jest.fn();
    window.browser = {
      downloads: {
        download,
        onChanged: { addListener, removeListener },
      },
    };

    createObjectURL.mockReturnValue('fake-blob-url');

    let listener;
    addListener.mockImplementation((callback) => {
      listener = callback;
    });

    download.mockImplementation(() => {
      setTimeout(() => {
        listener({
          state: { current: 'interrupted' },
          error: 'save-error',
        });
      }, 0);
      return Promise.resolve(1);
    });

    const log = [{ prop1: 'log1' }];

    const saveAsJson = save.saveAsJSON(log);
    await expect(saveAsJson).rejects.toThrowError('save-error');

    const blob = downloadFileFn.mock.calls[0][0];

    const blobContent = load.readFile(blob);
    await expect(blobContent).resolves.toBe(JSON.stringify(log));

    expect(downloadFileFn).toHaveBeenCalledTimes(1);
    expect(download).toHaveBeenCalledTimes(1);
    expect(download).toHaveBeenCalledWith({
      url: 'fake-blob-url',
      filename: 'activitylogs.json',
    });

    expect(addListener).toHaveBeenCalledTimes(1);
    expect(addListener).toHaveBeenCalledWith(listener);

    expect(removeListener).toHaveBeenCalledTimes(1);
    expect(removeListener).toHaveBeenCalledWith(listener);

    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('fake-blob-url');

    downloadFileFn.mockRestore();
  });
});
