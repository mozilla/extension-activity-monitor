export function dateTimeFormat(timestamp, options) {
  const dateTime = new Date(timestamp);
  const timeFormatOptions = { timeStyle: 'medium' };
  const dateFormatOptions = { dateStyle: 'medium' };

  const chosenOptions = options?.timeOnly
    ? timeFormatOptions
    : { ...timeFormatOptions, ...dateFormatOptions };

  return new Intl.DateTimeFormat(undefined, chosenOptions).format(dateTime);
}

function timestampFormat(timeStamp) {
  const startTime = timeStamp?.start ? timeStamp.start : null;
  const stopTime = timeStamp?.stop ? timeStamp.stop : null;
  return JSON.stringify([JSON.stringify(startTime), JSON.stringify(stopTime)]);
}

export function serializeFilters(updateFilter) {
  const currentURL = new URL(document.location.href);
  const searchParams = new URLSearchParams(currentURL.search.slice(1));

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
      searchParamVal = timestampFormat(updateFilter[key]);
    } else {
      searchParamVal = updateFilter[key];
    }

    searchParams.set(key, searchParamVal);
  });

  history.replaceState(null, null, `?${searchParams}`);
}

export function deSerializeFilters(searchParams) {
  const filterIds = searchParams.get('id');
  const filterViewTypes = searchParams.get('viewType');
  const filterTypes = searchParams.get('type');
  const filterNames = searchParams.get('name');
  const filterKeyword = searchParams.get('keyword');
  const filterTimestamp = searchParams.get('timeStamp');

  const ids = JSON.parse(filterIds);
  let viewTypes = JSON.parse(filterViewTypes);
  // converting empty string to undefined
  viewTypes = viewTypes?.map((viewType) =>
    viewType == null ? undefined : viewType
  );

  const types = JSON.parse(filterTypes);
  const names = JSON.parse(filterNames);
  let timestamps = JSON.parse(filterTimestamp);
  timestamps = timestamps?.map((timestamp) =>
    isNaN(timestamp) ? null : Number(timestamp)
  );

  const updateFilter = {
    id: new Set(ids),
    viewType: new Set(viewTypes),
    type: new Set(types),
    name: new Set(names),
    keyword: filterKeyword,
    timeStamp: timestamps || [],
  };

  return updateFilter;
}
