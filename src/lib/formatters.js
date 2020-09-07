export function dateTimeFormat(timestamp, options) {
  const dateTime = new Date(timestamp);
  const timeFormatOptions = { timeStyle: 'medium' };
  const dateFormatOptions = { dateStyle: 'medium' };

  const chosenOptions = options?.timeOnly
    ? timeFormatOptions
    : { ...timeFormatOptions, ...dateFormatOptions };

  return new Intl.DateTimeFormat(undefined, chosenOptions).format(dateTime);
}

export function serializeFilters(searchParams, updateFilter) {
  Object.keys(updateFilter).forEach((key) => {
    let searchParamVal = null;

    if (
      key === 'id' ||
      key === 'viewType' ||
      key === 'type' ||
      key === 'name'
    ) {
      searchParamVal = JSON.stringify([...updateFilter[key].exclude]);
    } else if (key === 'timeStamp') {
      searchParamVal = JSON.stringify(updateFilter[key]);
    } else {
      searchParamVal = updateFilter[key];
    }

    searchParams.set(key, searchParamVal);
  });

  return searchParams;
}

function getJSONParseVal(str, options) {
  if (typeof str !== 'string') {
    return null;
  }

  try {
    const parsedData = JSON.parse(str);
    if (options?.returnArray) {
      return Array.isArray(parsedData) ? parsedData : [];
    } else if (options?.returnObject) {
      return typeof parsedData === 'object' ? parsedData : null;
    }
  } catch (error) {
    return null;
  }
}

export function deSerializeFilters(searchParams) {
  const filterIds = searchParams.get('id');
  const filterViewTypes = searchParams.get('viewType');
  const filterTypes = searchParams.get('type');
  const filterNames = searchParams.get('name');
  const filterKeyword = searchParams.get('keyword') || '';
  const filterTimestamp = searchParams.get('timeStamp');
  const filterTabId = parseInt(searchParams.get('tabId'), 10) || null;

  const ids = getJSONParseVal(filterIds, { returnArray: true });
  const types = getJSONParseVal(filterTypes, { returnArray: true });
  const names = getJSONParseVal(filterNames, { returnArray: true });
  const timestamps = getJSONParseVal(filterTimestamp, { returnObject: true });

  let viewTypes = getJSONParseVal(filterViewTypes, { returnArray: true });
  viewTypes = viewTypes?.map((vt) => (vt == null ? undefined : vt));

  const updateFilter = {
    id: { exclude: new Set(ids) },
    viewType: { exclude: new Set(viewTypes) },
    type: { exclude: new Set(types) },
    name: { exclude: new Set(names) },
    keyword: filterKeyword,
    timeStamp: timestamps,
    tabId: filterTabId,
  };

  return updateFilter;
}
