export function dateTimeFormat(timestamp, options) {
  const dateTime = new Date(timestamp);
  const timeFormatOptions = { timeStyle: 'medium' };
  const dateFormatOptions = { dateStyle: 'medium' };

  const chosenOptions = options?.timeOnly
    ? timeFormatOptions
    : { ...timeFormatOptions, ...dateFormatOptions };

  return new Intl.DateTimeFormat(undefined, chosenOptions).format(dateTime);
}
