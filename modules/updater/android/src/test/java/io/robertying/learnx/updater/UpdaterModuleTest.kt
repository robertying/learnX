package io.robertying.learnx.updater

import android.Manifest
import android.content.Intent
import android.content.pm.PackageInfo
import android.content.pm.PackageInstaller
import android.content.pm.PackageManager
import io.mockk.every
import io.mockk.mockk
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertSame
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.io.File

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
