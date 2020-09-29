import * as formatters from '../src/lib/formatters';

test('serializeFilters method should return the updated search params', () => {
  const testUrl = new URL('http://test.html?timeStamp=null&id=["dummyId123"]');
  const searchParams = new URLSearchParams(testUrl.search.slice(1));

  const extIds = ['addon1@test.com', 'addon2@test.com'];
  const viewTypes = ['popup', undefined];
  const types = ['api_call', 'content_script'];
  const names = ['test@api'];
  const tabId = 22;
  const keyword = 'test@substring';
  const timeStamp = { start: 1597686226302, stop: 1597686226302 };

  const updateFilter = {
    id: { exclude: new Set(extIds) },
    viewType: { exclude: new Set(viewTypes) },
    type: { exclude: new Set(types) },
    name: { exclude: new Set(names) },
    tabId,
    keyword,
    timeStamp,
  };

  const serializedFormat = formatters.serializeFilters(
    searchParams,
    updateFilter
  );

  const expectedExtIds = '["addon1@test.com","addon2@test.com"]';
  const expectedViewTypes = '["popup",null]';
  const expectedTypes = '["api_call","content_script"]';
  const expectedNames = '["test@api"]';
  const expectedTabId = 22;
  const expectedTimestamp = '{"start":1597686226302,"stop":1597686226302}';

  const fetchedTabId = parseInt(searchParams.get('tabId'), 10) || null;

  expect(serializedFormat.get('id')).toStrictEqual(expectedExtIds);
  expect(serializedFormat.get('viewType')).toStrictEqual(expectedViewTypes);
  expect(serializedFormat.get('type')).toStrictEqual(expectedTypes);
  expect(serializedFormat.get('name')).toStrictEqual(expectedNames);
  expect(fetchedTabId).toStrictEqual(expectedTabId);
  expect(serializedFormat.get('keyword')).toStrictEqual(keyword);
  expect(serializedFormat.get('timeStamp')).toStrictEqual(expectedTimestamp);
});

test('deSerializeFilters method should return valid filter object', () => {
  const testUrl = new URL(
    'http://test.html?&id=["test1@addon","test2@addon"]&viewType=[null,"popup"]&type=["content_script","api_event"]&name=["tabs.executeScript"]&timeStamp={"start":123123,"stop":456456}&keyword=undefined&tabId=982'
  );

  const expectedFilterObject = {
    id: { exclude: new Set(['test1@addon', 'test2@addon']) },
    viewType: { exclude: new Set([undefined, 'popup']) },
    type: { exclude: new Set(['content_script', 'api_event']) },
    name: { exclude: new Set(['tabs.executeScript']) },
    tabId: 982,
    keyword: 'undefined',
    timeStamp: { start: 123123, stop: 456456 },
  };

  const searchParams = new URLSearchParams(testUrl.search.slice(1));
  const filterObject = formatters.deSerializeFilters(searchParams);

  expect(filterObject).toMatchObject(expectedFilterObject);
});

test('deSerializeFilters method should return the filter object with valid filter properties, ignoring the invalid filter properties', () => {
  // only "type" is valid here
  const testUrl = new URL(
    'http://test.html?invalidParam="wrongValue"&id=null&viewType="wrong-type"&type={}&name=["tabs.executeScript"]&timeStamp=wrong-type&tabId=undefined'
  );
  const expectedFilterObject = {
    id: { exclude: new Set() },
    viewType: { exclude: new Set() },
    type: { exclude: new Set() },
    name: { exclude: new Set(['tabs.executeScript']) },
    tabId: null,
    keyword: '',
    timeStamp: null,
  };

  const searchParams = new URLSearchParams(testUrl.search.slice(1));
  const filterObject = formatters.deSerializeFilters(searchParams);

  expect(filterObject).toMatchObject(expectedFilterObject);
});
