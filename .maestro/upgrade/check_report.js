// Checks the store report (screens/StoreReport) copied by 2_after_upgrade.yaml
// against what 1_use_18.0.3.yaml did on 18.0.3, with 18.0.3's mock data
// (src/data/mock.ts at v18.0.3). PHASE is `migrated` (first launch, before any
// sync) or `synced` (after the app has run and synced). Sets
// output.report.ok and logs every mismatch.
const report = JSON.parse(maestro.copiedText);
const ios = maestro.platform === 'ios';
const failures = [];

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const expect = (name, actual, expected) => {
  if (!same(actual, expected)) {
    failures.push(
      `${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
};
const check = (name, ok, detail) => {
  if (!ok) {
    failures.push(`${name}: ${JSON.stringify(detail)}`);
  }
};

if (report === null) {
  failures.push('no report: the saved login is not the mock account');
} else {
  // The login moved from persist_auth, as the mock account.
  expect('credentials', report.credentials, {
    username: USERNAME,
    hasPassword: true,
    fingerPrint: 'fingerPrint',
  });
  // An upgrade, not an install, and 18.0.3's keys are gone.
  expect('marks', report.marks, { installed: true, legacyImported: true });
  expect('legacy keys left', report.legacyLeft, {
    root: false,
    settings: false,
    auth: false,
    downloads: false,
    documentDownloads: false,
  });

  // Settings: what 18.0.3's mock had, plus what the flow turned on. The
  // 18.0.3-only settings (download folder, file names, update badge,
  // changelog version) are gone.
  const s = report.settings;
  expect('settings.graduate', s.graduate, true);
  expect('settings.courseEventOmitLocation', s.courseEventOmitLocation, true);
  // 18.0.3 had this switch on Android only.
  expect('settings.openFileAfterDownload', s.openFileAfterDownload, !ios);
  expect('settings.courseInformationSharing', s.courseInformationSharing, true);
  expect('settings.assignmentCalendarSync', s.assignmentCalendarSync, true);
  expect('settings.assignmentReminderSync', s.assignmentReminderSync, ios);
  expect('settings.alarms.courseAlarm', s.alarms.courseAlarm, true);
  expect('settings.tabFilterSelections', s.tabFilterSelections, {
    notice: 'all',
    assignment: 'unfinished',
    file: 'all',
    course: 'all',
  });
  for (const key of [
    'fileUseDocumentDir',
    'fileOmitCourseName',
    'newUpdate',
    'lastShowChangelogVersion',
    'courseCalendarId',
    'assignmentCalendarId',
    'syncedCalendarAssignments',
    'courseInformationSharingBadgeShown',
  ]) {
    check(`settings.${key} dropped`, !(key in s), s[key]);
  }

  // What the user did to their courses and content.
  const u = report.userData;
  expect('userData.hiddenCourses', u.hiddenCourses, ['2019-2020-1139286494']);
  expect('userData.courseOrder', u.courseOrder, []);
  expect('userData.archived', u.archived, {
    notice: ['26ef84e76cc258ed016d3ea25a95157d'],
    assignment: [],
    file: ['1996990293_KJ_15706235088371327f3cdca-80cd-48b1-ab44-51afe80978b5'],
  });

  // Seen badges and pages.
  expect('appState.courseSharingSeen', report.appState.courseSharingSeen, true);
  expect('appState.welcomeSeen', report.appState.welcomeSeen, false);

  // The calendars 18.0.3 made, now in their own store.
  const c = report.calendarSync;
  check('calendarSync.assignmentCalendarId', !!c.assignmentCalendarId, c);
  check(
    'calendarSync.syncedCalendarAssignments',
    Object.keys(c.syncedCalendarAssignments).length > 0,
    c.syncedCalendarAssignments,
  );
  if (ios) {
    check('calendarSync.assignmentReminderId', !!c.assignmentReminderId, c);
    check(
      'calendarSync.syncedReminderAssignments',
      Object.keys(c.syncedReminderAssignments).length > 0,
      c.syncedReminderAssignments,
    );
  }

  // Each saved calendar still exists, once, and holds one entry per saved id.
  const calendars = [['assignment', 'syncedCalendarAssignments']];
  if (ios) {
    calendars.push(['reminder', 'syncedReminderAssignments']);
  }
  for (const [name, synced] of calendars) {
    const calendar = report.calendars[name];
    check(`calendars.${name} saved`, calendar && calendar.saved, calendar);
    check(
      `calendars.${name} not duplicated`,
      calendar && calendar.withTitle === 1,
      calendar,
    );
    if (PHASE === 'synced') {
      expect(
        `calendars.${name} entries`,
        calendar && calendar.entries,
        Object.keys(c[synced]).length,
      );
    }
  }

  if (PHASE === 'migrated') {
    // 18.0.3's favorites kept on the phone, queued for the website.
    expect(
      'userData.pendingActions',
      u.pendingActions,
      [
        ['notice', '26ef84e76d60efc1016d71b8f4c63bc1'],
        ['notice', '26ef84e76cc258ed016d3ea25a95157d'],
        [
          'file',
          '2016310500_KJ_157080064094130b5f1dcc2-f77a-4cca-be0f-95808af85d82',
        ],
        [
          'file',
          '2009990022_KJ_1570695522456476bc2332-2988-4497-9505-d12d41906be0',
        ],
        [
          'file',
          '1996990293_KJ_15706235088371327f3cdca-80cd-48b1-ab44-51afe80978b5',
        ],
      ].map(([type, id]) => ({
        kind: 'favorite',
        type,
        id,
        flag: true,
        tries: 0,
      })),
    );
    expect('appState.setupSeen', report.appState.setupSeen, false);
  } else {
    // Sent once the app synced. These are 18.0.3's mock ids, which the
    // current mock server doesn't have: it answers them with an error, as the
    // website would, so each was tried and stays until its third try.
    for (const action of u.pendingActions) {
      check(
        `userData.pendingActions ${action.id} sent`,
        action.kind === 'favorite' && action.tries >= 1,
        action,
      );
    }
    expect('appState.setupSeen', report.appState.setupSeen, true);
    check(
      'calendarSync.lastSynced',
      c.lastSynced.indexOf('calendar') >= 0,
      c.lastSynced,
    );
  }
}

// What's New: none for a version without highlights. The flow shows it on the
// app's second launch when the first report says there is one, and it is seen
// after that.
if (report !== null) {
  if (PHASE === 'migrated') {
    output.whatsNew = report.whatsNew;
  } else {
    expect('whatsNew left', report.whatsNew, null);
    if (output.whatsNew) {
      expect(
        'appState.whatsNewSeenVersion',
        report.appState.whatsNewSeenVersion,
        output.whatsNew,
      );
    }
  }
}

for (const failure of failures) {
  console.log(`store report (${PHASE}): ${failure}`);
}
output.report = { ok: failures.length === 0, failures };
