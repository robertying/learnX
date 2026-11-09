// Compose's date pickers work in UTC-midnight days: each local day goes in as
// that day's UTC midnight, and the picked days come back as local midnights.

/** A local day as the UTC midnight of the same date, in ISO form. */
export const toPickerDay = (date: Date | undefined) =>
  date
    ? new Date(
        Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
      ).toISOString()
    : undefined;

/** A picked UTC-midnight day as the local midnight of the same date. */
export const fromPickerDay = (date: Date) =>
  new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
