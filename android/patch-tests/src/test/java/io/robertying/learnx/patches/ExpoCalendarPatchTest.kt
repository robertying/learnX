package io.robertying.learnx.patches

import android.content.ContentProvider
import android.content.ContentValues
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.provider.CalendarContract
import android.provider.CalendarContract.Calendars
import expo.modules.calendar.next.domain.repositories.calendar.CalendarRepository
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

/**
 * What patches/expo-calendar@58.0.6.patch changes on Android: calendars are found on a provider that doesn't know
 * IS_PRIMARY, as on HarmonyOS, where asking for it made the query throw.
 */
@RunWith(RobolectricTestRunner::class)
class ExpoCalendarPatchTest {
  /** A calendar provider whose projection map leaves out IS_PRIMARY. */
  class CalendarProviderWithoutIsPrimary : ContentProvider() {
    private val row = mapOf<String, Any>(
      Calendars._ID to 1L,
      Calendars.ACCOUNT_NAME to "learnX",
      Calendars.ACCOUNT_TYPE to CalendarContract.ACCOUNT_TYPE_LOCAL,
      Calendars.ALLOWED_ATTENDEE_TYPES to "0,1",
      Calendars.ALLOWED_AVAILABILITY to "0,1",
      Calendars.ALLOWED_REMINDERS to "0,1",
      Calendars.CALENDAR_ACCESS_LEVEL to Calendars.CAL_ACCESS_OWNER,
      Calendars.CALENDAR_COLOR to 0x660874,
      Calendars.CALENDAR_DISPLAY_NAME to "learnX",
      Calendars.CALENDAR_TIME_ZONE to "Asia/Shanghai",
      Calendars.NAME to "learnX",
      Calendars.OWNER_ACCOUNT to "learnX",
      Calendars.SYNC_EVENTS to 1,
      Calendars.VISIBLE to 1,
    )

    override fun onCreate() = true

    override fun query(
      uri: Uri,
      projection: Array<out String>?,
      selection: String?,
      selectionArgs: Array<out String>?,
      sortOrder: String?,
    ): Cursor {
      val columns = projection ?: row.keys.toTypedArray()
      for (column in columns) {
        require(column in row) { "Invalid column $column" }
      }
      return MatrixCursor(columns).apply { addRow(columns.map { row[it] }) }
    }

    override fun getType(uri: Uri): String? = null

    override fun insert(uri: Uri, values: ContentValues?): Uri? = null

    override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?) = 0

    override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<out String>?) = 0
  }

  @Test
  fun findsCalendarsOnAProviderWithoutIsPrimary() = runBlocking {
    Robolectric.setupContentProvider(CalendarProviderWithoutIsPrimary::class.java, CalendarContract.AUTHORITY)
    val resolver = RuntimeEnvironment.getApplication().contentResolver

    val calendar = CalendarRepository(resolver).findAll().single()
    assertEquals("learnX", calendar.calendarDisplayName)
    assertEquals(0x660874, calendar.calendarColor)
    assertFalse(calendar.isPrimary)
  }
}
