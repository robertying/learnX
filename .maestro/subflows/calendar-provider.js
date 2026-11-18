// Asks scripts/e2e/e2e-calendar.mjs whether the device's calendar has (FOUND
// 'true') or no longer has an event whose "title | location" matches MATCH.
const response = http.get(
  `${CALENDAR_URL}?match=${encodeURIComponent(MATCH)}&found=${FOUND}`,
);
output.calendarAsExpected = response.body === 'true';
