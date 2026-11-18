// Settings › Calendar in the Electron app: Windows and Linux have no
// calendar on the device to sync to, so it exports an .ics file instead,
// saved where the save dialog (the main process's stand-in) says. The file
// has what 08-settings looks for in the phone's calendar: the mock course's
// classes in room 6A118 and the mock assignment's deadline.
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from './fixtures.ts';
import { exact, text } from './maestroEnv.ts';
import { byId, openSettings, openSettingsPage } from './steps.ts';

test('exports the classes and deadlines as an .ics file', async ({
  window,
  main,
  dataDir,
  login,
}) => {
  await login();
  await openSettings(window);
  await openSettingsPage(window, 'settings-calendar', 'calendar-settings');
  // No calendar sync on the desktop: only the export.
  await expect(window.getByTestId('calendar-course-sync')).toHaveCount(0);

  // The dates come first, today and the next four weeks as on the phones;
  // cancelling them asks nothing more.
  const dates = window.getByRole('dialog');
  await byId(window, 'calendar-export').click();
  await expect(
    dates.getByRole('heading', { name: exact('T_exportRangeTitle') }),
  ).toBeVisible();
  const day = (offset: number) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return date.toLocaleDateString('sv');
  };
  await expect(dates.locator('input[type="date"]').first()).toHaveValue(day(0));
  await expect(dates.locator('input[type="date"]').last()).toHaveValue(day(28));
  await dates.getByRole('button', { name: exact('T_cancel') }).click();
  await expect(dates).toHaveCount(0);
  expect((await main.record()).dialogs).toHaveLength(0);
  const exportDates = async () => {
    await byId(window, 'calendar-export').click();
    await dates
      .getByRole('button', { name: exact('T_exportRangeSave') })
      .click();
  };

  // The save dialog cancelled: nothing saved.
  await exportDates();
  await expect.poll(async () => (await main.record()).dialogs.length).toBe(1);
  const [cancelled] = (await main.record()).dialogs;
  expect(cancelled).toMatchObject({
    type: 'save',
    options: { defaultPath: expect.stringMatching(/\.ics$/) },
  });

  const saved = path.join(dataDir, 'learnX.ics');
  await main.stub({ save: saved });
  await exportDates();
  // Read once it's all there: writeFile creates the file before it writes
  // to it, and Windows runners caught it empty in between.
  const read = () =>
    fs.existsSync(saved) ? fs.readFileSync(saved, 'utf8') : '';
  await expect.poll(read).toMatch(/END:VCALENDAR\s*$/);
  const ics = read();
  expect(ics).toMatch(/^BEGIN:VCALENDAR\r?\n/);
  const events = ics.split('BEGIN:VEVENT').slice(1);
  const unfold = (event: string) => event.replace(/\r?\n[ \t]/g, '');
  expect(
    events.some(
      event => text('MOCK_COURSE').test(unfold(event)) && /6A118/.test(event),
    ),
  ).toBe(true);
  expect(
    events.some(event => text('MOCK_ASSIGNMENT').test(unfold(event))),
  ).toBe(true);
});
