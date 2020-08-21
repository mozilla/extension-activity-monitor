export function dateTimeFormat(timestamp, options) {
  const dateTime = new Date(timestamp);
  const timeFormatOptions = {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  };
  const time = new Intl.DateTimeFormat(undefined, timeFormatOptions).format(
    dateTime
  );

  if (options?.timeOnly) {
    return time;
  }

  const dateFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  const date = new Intl.DateTimeFormat(undefined, dateFormatOptions).format(
    dateTime
  );

  return `${date} ${time}`;
}
