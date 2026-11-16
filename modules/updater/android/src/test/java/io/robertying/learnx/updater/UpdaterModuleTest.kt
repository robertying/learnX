package io.robertying.learnx.updater

import android.Manifest
import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInfo
import android.content.pm.PackageInstaller
import android.content.pm.PackageManager
import android.content.pm.Signature
import android.content.pm.SigningInfo
import android.net.Uri
import android.provider.Settings
import androidx.core.content.ContextCompat
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.Promise
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.spyk
import io.mockk.unmockkStatic
import io.mockk.verify
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.IOException

private const val PACKAGE = "io.robertying.learnx"
private val ownKey = byteArrayOf(1, 2, 3)
private val oldKey = byteArrayOf(4, 5)
private val otherKey = byteArrayOf(9)

class ChecksumTest {
  @Test
  fun hashesTheFile() {
    val file = File.createTempFile("update", ".apk").apply {
      deleteOnExit()
      writeText("learnX")
    }
    assertEquals("55466dbcf5d0c99da3364f90d320294b63275ae9edc7d7f4608621da535f7fd8", UpdaterModule.sha256Hex(file))
  }

  @Test
  fun hashesAnEmptyFile() {
    val file = File.createTempFile("update", ".apk").apply { deleteOnExit() }
    assertEquals("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", UpdaterModule.sha256Hex(file))
  }
}

class CheckArchiveTest {
  private fun code(block: () -> Unit) = assertThrows(UpdateException::class.java, block).code

  @Test
  fun acceptsTheSameAppAndKey() {
    UpdaterModule.checkArchive(PACKAGE, listOf(ownKey), listOf(ownKey), PACKAGE)
  }

  @Test
  fun acceptsAKeyRotatedFromTheInstalledOne() {
    UpdaterModule.checkArchive(PACKAGE, listOf(byteArrayOf(7), ownKey), listOf(ownKey), PACKAGE)
  }

  @Test
  fun refusesAnUnreadableFile() {
    assertEquals(UpdaterModule.SIGNATURE, code { UpdaterModule.checkArchive(null, null, listOf(ownKey), PACKAGE) })
    assertEquals(UpdaterModule.SIGNATURE, code { UpdaterModule.checkArchive(PACKAGE, null, listOf(ownKey), PACKAGE) })
  }

  @Test
  fun refusesAnotherApp() {
    assertEquals(UpdaterModule.SIGNATURE, code { UpdaterModule.checkArchive("com.example", listOf(ownKey), listOf(ownKey), PACKAGE) })
  }

  @Test
  fun refusesAnotherKey() {
    assertEquals(UpdaterModule.SIGNATURE, code { UpdaterModule.checkArchive(PACKAGE, listOf(otherKey), listOf(ownKey), PACKAGE) })
  }

  @Test
  fun needsEveryInstalledSigner() {
    assertEquals(UpdaterModule.SIGNATURE, code { UpdaterModule.checkArchive(PACKAGE, listOf(ownKey), listOf(ownKey, oldKey), PACKAGE) })
    assertEquals(UpdaterModule.SIGNATURE, code { UpdaterModule.checkArchive(PACKAGE, listOf(ownKey), emptyList(), PACKAGE) })
  }
}

@RunWith(RobolectricTestRunner::class)
class InstallPermissionTest {
  private fun packageManager(permissions: Array<String>?): PackageManager {
    val info = PackageInfo().apply { requestedPermissions = permissions }
    return mockk { every { getPackageInfo(PACKAGE, PackageManager.GET_PERMISSIONS) } returns info }
  }

  @Test
  fun isSupportedWhereTheBuildMayInstall() {
    assertTrue(UpdaterModule.declaresInstallPermission(packageManager(arrayOf(Manifest.permission.INTERNET, Manifest.permission.REQUEST_INSTALL_PACKAGES)), PACKAGE))
  }

  @Test
  fun isNotSupportedInTheGooglePlayBuild() {
    assertFalse(UpdaterModule.declaresInstallPermission(packageManager(arrayOf(Manifest.permission.INTERNET)), PACKAGE))
    assertFalse(UpdaterModule.declaresInstallPermission(packageManager(null), PACKAGE))
  }
}

@RunWith(RobolectricTestRunner::class)
class StatusTest {
  private fun status(code: Int?, message: String? = null, extra: Intent? = null) = UpdaterModule.statusOf(
    Intent().apply {
      code?.let { putExtra(PackageInstaller.EXTRA_STATUS, it) }
      message?.let { putExtra(PackageInstaller.EXTRA_STATUS_MESSAGE, it) }
      extra?.let { putExtra(Intent.EXTRA_INTENT, it) }
    },
  )

  @Test
  fun asksForConfirmation() {
    val confirm = Intent("android.content.pm.action.CONFIRM_INSTALL")
    val result = status(PackageInstaller.STATUS_PENDING_USER_ACTION, extra = confirm)
    assertTrue(result is InstallStatus.NeedsConfirmation)
    assertEquals(confirm.action, (result as InstallStatus.NeedsConfirmation).intent?.action)
  }

  @Test
  fun succeeds() {
    assertSame(InstallStatus.Done, status(PackageInstaller.STATUS_SUCCESS))
  }

  @Test
  fun isCancelled() {
    assertEquals(InstallStatus.Failed(UpdaterModule.CANCELLED, "The install was cancelled"), status(PackageInstaller.STATUS_FAILURE_ABORTED))
  }

  @Test
  fun failsWithTheInstallersMessage() {
    assertEquals(InstallStatus.Failed(UpdaterModule.FAILED, "INSTALL_FAILED_INSUFFICIENT_STORAGE"), status(PackageInstaller.STATUS_FAILURE_STORAGE, "INSTALL_FAILED_INSUFFICIENT_STORAGE"))
  }

  @Test
  fun failsWithoutAStatus() {
    assertEquals(InstallStatus.Failed(UpdaterModule.FAILED, "The install failed (${PackageInstaller.STATUS_FAILURE})"), status(null))
  }
}

@RunWith(RobolectricTestRunner::class)
class SignersTest {
  private fun archive(current: Array<Signature>?, history: Array<Signature>?, multiple: Boolean = false) = PackageInfo().apply {
    signingInfo = mockk<SigningInfo> {
      every { apkContentsSigners } returns current
      every { signingCertificateHistory } returns history
      every { hasMultipleSigners() } returns multiple
    }
  }

  @Test
  fun readsTheCurrentAndPastKeys() {
    val signers = UpdaterModule.signersOf(archive(arrayOf(Signature(ownKey)), arrayOf(Signature(oldKey), Signature(ownKey))))
    assertEquals(listOf(ownKey, oldKey, ownKey).map { it.toList() }, signers?.map { it.toList() })
  }

  @Test
  fun hasNoHistoryWithSeveralSigners() {
    val signers = UpdaterModule.signersOf(archive(arrayOf(Signature(ownKey), Signature(otherKey)), arrayOf(Signature(oldKey)), multiple = true))
    assertEquals(listOf(ownKey, otherKey).map { it.toList() }, signers?.map { it.toList() })
  }

  @Test
  fun readsMissingArrays() {
    assertEquals(emptyList<ByteArray>(), UpdaterModule.signersOf(archive(null, null)))
  }

  @Test
  fun hasNoSignersWithoutSigningInfo() {
    assertNull(UpdaterModule.signersOf(PackageInfo()))
  }
}

/** A promise that records how it settled. */
private class RecordingPromise : Promise {
  var resolved = false
  var rejected: String? = null

  override fun resolve(value: Any?) {
    resolved = true
  }

  override fun reject(code: String?, message: String?, cause: Throwable?) {
    rejected = code
  }
}

@RunWith(RobolectricTestRunner::class)
class InstallTest {
  private val sessionId = 7
  private val apk = File.createTempFile("update", ".apk").apply {
    deleteOnExit()
    writeText("learnX")
  }
  private val checksum = "55466dbcf5d0c99da3364f90d320294b63275ae9edc7d7f4608621da535f7fd8"

  private fun signed(vararg keys: ByteArray) = mockk<SigningInfo> {
    every { apkContentsSigners } returns keys.map(::Signature).toTypedArray()
    every { signingCertificateHistory } returns null
    every { hasMultipleSigners() } returns false
  }

  private val written = ByteArrayOutputStream()
  private val session = mockk<PackageInstaller.Session>(relaxed = true) {
    every { openWrite("base.apk", 0, any()) } returns written
  }
  private val installer = mockk<PackageInstaller>(relaxed = true) {
    every { createSession(any()) } returns sessionId
    every { openSession(sessionId) } returns session
  }
  private var archive: PackageInfo? = PackageInfo().apply {
    packageName = PACKAGE
    signingInfo = signed(ownKey)
  }
  private var allowed = true
  private val packageManager = mockk<PackageManager> {
    every { getPackageArchiveInfo(any(), any<Int>()) } answers { archive }
    every { getPackageInfo(PACKAGE, PackageManager.GET_SIGNING_CERTIFICATES) } returns PackageInfo().apply { signingInfo = signed(ownKey) }
    every { getPackageInfo(PACKAGE, PackageManager.GET_PERMISSIONS) } returns PackageInfo().apply { requestedPermissions = arrayOf(Manifest.permission.REQUEST_INSTALL_PACKAGES) }
    every { canRequestPackageInstalls() } answers { allowed }
    every { packageInstaller } returns installer
  }
  private val context = mockk<Context>(relaxed = true) {
    every { packageName } returns PACKAGE
    every { packageManager } returns this@InstallTest.packageManager
  }
  private val activity = mockk<Activity>(relaxed = true)
  private val appContext = mockk<AppContext> {
    every { reactContext } returns context
    every { currentActivity } returns activity
  }
  private val module = spyk(UpdaterModule()) { every { appContext } returns this@InstallTest.appContext }
  private val receivers = mutableListOf<BroadcastReceiver>()

  @Before
  fun setUp() {
    mockkStatic(ContextCompat::class)
    every { ContextCompat.registerReceiver(context, capture(receivers), any(), ContextCompat.RECEIVER_NOT_EXPORTED) } returns null
  }

  @After
  fun tearDown() {
    unmockkStatic(ContextCompat::class)
  }

  private fun install(promise: Promise = RecordingPromise(), sha256: String = checksum) = module.install(Uri.fromFile(apk).toString(), sha256, promise)

  private fun report(status: Int, extra: Intent? = null) = receivers.last().onReceive(
    context,
    Intent().putExtra(PackageInstaller.EXTRA_STATUS, status).apply { extra?.let { putExtra(Intent.EXTRA_INTENT, it) } },
  )

  private fun code(block: () -> Unit) = assertThrows(UpdateException::class.java, block).code

  @Test
  fun definesItsFunctions() {
    module.definition()
  }

  @Test
  @Suppress("DEPRECATION")
  fun installsTheUpdate() {
    val promise = RecordingPromise()
    install(promise)
    assertEquals("learnX", written.toString())
    verify { session.commit(any()) }
    verify { packageManager.getPackageArchiveInfo(apk.path, PackageManager.GET_SIGNING_CERTIFICATES) }
    report(PackageInstaller.STATUS_SUCCESS)
    assertTrue(promise.resolved)
    verify { context.unregisterReceiver(receivers.last()) }
    verify(exactly = 0) { installer.abandonSession(any()) }
  }

  @Test
  @Config(sdk = [29])
  fun installsOnOlderAndroid() {
    val promise = RecordingPromise()
    install(promise)
    report(PackageInstaller.STATUS_SUCCESS)
    assertTrue(promise.resolved)
  }

  @Test
  fun showsAndroidsConfirmation() {
    val confirm = Intent("android.content.pm.action.CONFIRM_INSTALL")
    install()
    report(PackageInstaller.STATUS_PENDING_USER_ACTION, confirm)
    verify { activity.startActivity(match { it.action == confirm.action }) }
  }

  @Test
  fun showsTheConfirmationWithoutAnActivity() {
    every { appContext.currentActivity } returns null
    install()
    report(PackageInstaller.STATUS_PENDING_USER_ACTION, Intent("android.content.pm.action.CONFIRM_INSTALL"))
    verify { context.startActivity(match { it.flags and Intent.FLAG_ACTIVITY_NEW_TASK != 0 }) }
  }

  @Test
  fun failsWhenTheConfirmationIsMissing() {
    val promise = RecordingPromise()
    install(promise)
    report(PackageInstaller.STATUS_PENDING_USER_ACTION)
    assertEquals(UpdaterModule.FAILED, promise.rejected)
    verify { installer.abandonSession(sessionId) }
  }

  @Test
  fun reportsACancelledInstall() {
    val promise = RecordingPromise()
    install(promise)
    report(PackageInstaller.STATUS_FAILURE_ABORTED)
    assertEquals(UpdaterModule.CANCELLED, promise.rejected)
    // Settles once.
    report(PackageInstaller.STATUS_SUCCESS)
    assertFalse(promise.resolved)
  }

  @Test
  fun cancelsTheInstallStillWaiting() {
    val first = RecordingPromise()
    install(first)
    install(RecordingPromise())
    assertEquals(UpdaterModule.CANCELLED, first.rejected)
  }

  @Test
  fun failsWhenTheSessionCantBeWritten() {
    every { installer.openSession(sessionId) } throws IOException("No space left")
    every { context.unregisterReceiver(any()) } throws IllegalArgumentException("Not registered")
    every { installer.abandonSession(sessionId) } throws SecurityException("Gone")
    val promise = RecordingPromise()
    install(promise)
    assertEquals(UpdaterModule.FAILED, promise.rejected)
  }

  @Test
  fun failsWithoutAMessage() {
    every { installer.openSession(sessionId) } throws IOException()
    val promise = RecordingPromise()
    install(promise)
    assertEquals(UpdaterModule.FAILED, promise.rejected)
  }

  @Test
  fun refusesAMissingFile() {
    apk.delete()
    assertEquals(UpdaterModule.FAILED, code { install() })
  }

  @Test
  fun refusesAWrongChecksum() {
    assertEquals(UpdaterModule.CHECKSUM, code { install(sha256 = "00") })
  }

  @Test
  fun acceptsAnUppercaseChecksum() {
    install(sha256 = checksum.uppercase())
    verify { session.commit(any()) }
  }

  @Test
  fun refusesAnUnreadableApk() {
    archive = null
    assertEquals(UpdaterModule.SIGNATURE, code { install() })
  }

  @Test
  fun refusesAnotherKey() {
    archive = PackageInfo().apply {
      packageName = PACKAGE
      signingInfo = signed(otherKey)
    }
    assertEquals(UpdaterModule.SIGNATURE, code { install() })
  }

  @Test
  fun refusesWithoutPermission() {
    allowed = false
    assertEquals(UpdaterModule.NOT_ALLOWED, code { install() })
  }

  @Test
  fun opensInstallSettings() {
    module.openInstallSettings()
    verify { activity.startActivity(match { it.action == Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES && it.data == Uri.parse("package:$PACKAGE") }) }
  }

  @Test
  fun opensInstallSettingsWithoutAnActivity() {
    every { appContext.currentActivity } returns null
    module.openInstallSettings()
    verify { context.startActivity(match { it.action == Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES && it.flags and Intent.FLAG_ACTIVITY_NEW_TASK != 0 }) }
  }
}
