export function dateTimeFormat(timestamp, options) {
  const dateTime = new Date(timestamp);
  const timeFormatOptions = { timeStyle: 'medium' };
  const dateFormatOptions = { dateStyle: 'medium' };

  const chosenOption = options?.timeOnly
    ? timeFormatOptions
    : { ...timeFormatOptions, ...dateFormatOptions };

  return new Intl.DateTimeFormat(undefined, chosenOption).format(dateTime);
}
