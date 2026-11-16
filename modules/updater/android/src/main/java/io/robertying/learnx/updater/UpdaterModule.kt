package io.robertying.learnx.updater

import android.Manifest
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageInfo
import android.content.pm.PackageInstaller
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.ContextCompat
import androidx.core.content.IntentCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.security.MessageDigest

/**
 * Installs a new version of learnX from an APK the app downloaded (the github flavor's APKs, from the TUNA mirror),
 * after checking it is the one `latest.json` names (its SHA-256) and an update of this app: the same package, signed
 * with the same key. Android would refuse a different key too, but checking first gives a clear error. The install
 * goes through a `PackageInstaller` session: Android asks to confirm, except on Android 12+ once learnX installed the
 * version it updates.
 *
 * Only builds that declare `REQUEST_INSTALL_PACKAGES` (the github flavor, `android/app/src/github`) can install:
 * `isSupported` is false in the Google Play build, which Google Play updates.
 */
class UpdaterModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  @Volatile private var pending: PendingInstall? = null

  override fun definition() = ModuleDefinition {
    Name("LearnXUpdater")

    Constant("isSupported") { declaresInstallPermission(context.packageManager, context.packageName) }

    Function("canInstall") { context.packageManager.canRequestPackageInstalls() }

    Function("openInstallSettings") { openInstallSettings() }

    AsyncFunction("install") { uri: String, sha256: String, promise: Promise -> install(uri, sha256, promise) }

    OnDestroy { pending?.finish(UpdateException(CANCELLED, "The app closed before the install finished")) }
  }

  /** The system page where people allow learnX to install apps ("Install unknown apps"). */
  internal fun openInstallSettings() {
    val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${context.packageName}"))
    val activity = appContext.currentActivity
    if (activity != null) {
      activity.startActivity(intent)
    } else {
      context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
  }

  internal fun install(uri: String, sha256: String, promise: Promise) {
    val context = context
    val file = File(Uri.parse(uri).path ?: uri)
    val pm = context.packageManager
    val packageName = context.packageName

    if (!file.isFile) {
      throw UpdateException(FAILED, "No downloaded update at $uri")
    }
    if (!sha256Hex(file).equals(sha256, ignoreCase = true)) {
      throw UpdateException(CHECKSUM, "The download doesn't match its SHA-256")
    }
    @Suppress("DEPRECATION")
    val archive = pm.getPackageArchiveInfo(file.path, PackageManager.GET_SIGNING_CERTIFICATES)
    @Suppress("DEPRECATION")
    val installed = pm.getPackageInfo(packageName, PackageManager.GET_SIGNING_CERTIFICATES)
    checkArchive(archive?.packageName, archive?.let(::signersOf), installed.signingInfo?.apkContentsSigners.orEmpty().map { it.toByteArray() }, packageName)
    if (!pm.canRequestPackageInstalls()) {
      throw UpdateException(NOT_ALLOWED, "learnX isn't allowed to install apps")
    }

    // A new install replaces one still waiting, e.g. a confirmation dismissed without an answer, which some Android
    // versions never report.
    pending?.finish(UpdateException(CANCELLED, "Another install started"))
    val installer = pm.packageInstaller
    val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL).apply {
      setAppPackageName(packageName)
      setSize(file.length())
      setInstallReason(PackageManager.INSTALL_REASON_USER)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        // No second confirmation when learnX installed the version it updates (Android 12+).
        setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
      }
    }
    val sessionId = installer.createSession(params)
    val install = PendingInstall(context, installer, sessionId, promise)
    pending = install
    try {
      installer.openSession(sessionId).use { session ->
        session.openWrite("base.apk", 0, file.length()).use { out ->
          file.inputStream().use { it.copyTo(out) }
          session.fsync(out)
        }
        session.commit(install.statusReceiver())
      }
    } catch (error: Exception) {
      install.finish(UpdateException(FAILED, error.message ?: "The install couldn't start"))
    }
  }

  /**
   * One install session: hears its status from the installer, shows Android's confirmation when it asks for one, and
   * settles the JS promise with the outcome. Updating learnX itself ends this process, so a successful update of the
   * running app never resolves.
   */
  private inner class PendingInstall(
    private val context: Context,
    private val installer: PackageInstaller,
    private val sessionId: Int,
    private val promise: Promise,
  ) {
    private val action = "${context.packageName}.updater.STATUS.$sessionId"
    private var done = false

    private val receiver = object : BroadcastReceiver() {
      override fun onReceive(context: Context, intent: Intent) {
        when (val status = statusOf(intent)) {
          is InstallStatus.NeedsConfirmation -> confirm(status.intent)
          is InstallStatus.Done -> finish(null)
          is InstallStatus.Failed -> finish(UpdateException(status.code, status.message))
        }
      }
    }

    fun statusReceiver(): android.content.IntentSender {
      ContextCompat.registerReceiver(context, receiver, IntentFilter(action), ContextCompat.RECEIVER_NOT_EXPORTED)
      val intent = Intent(action).setPackage(context.packageName)
      // Mutable: the installer adds the status to it.
      return PendingIntent.getBroadcast(context, sessionId, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE).intentSender
    }

    private fun confirm(intent: Intent?) {
      if (intent == null) {
        finish(UpdateException(FAILED, "The installer asked for a confirmation it didn't provide"))
        return
      }
      val activity = appContext.currentActivity
      if (activity != null) {
        activity.startActivity(intent)
      } else {
        context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
    }

    fun finish(error: CodedException?) {
      if (done) {
        return
      }
      done = true
      if (pending === this) {
        pending = null
      }
      try {
        context.unregisterReceiver(receiver)
      } catch (_: IllegalArgumentException) {
        // Not registered yet: the session failed before it was committed.
      }
      if (error != null) {
        try {
          installer.abandonSession(sessionId)
        } catch (_: Exception) {
          // Already finished.
        }
        promise.reject(error)
      } else {
        promise.resolve(null)
      }
    }
  }

  internal companion object {
    const val CHECKSUM = "ERR_UPDATE_CHECKSUM"
    const val SIGNATURE = "ERR_UPDATE_SIGNATURE"
    const val NOT_ALLOWED = "ERR_UPDATE_NOT_ALLOWED"
    const val CANCELLED = "ERR_UPDATE_CANCELLED"
    const val FAILED = "ERR_UPDATE_FAILED"

    /** Whether this build may install apps: only the github flavor declares the permission. */
    fun declaresInstallPermission(pm: PackageManager, packageName: String): Boolean {
      @Suppress("DEPRECATION")
      val info = pm.getPackageInfo(packageName, PackageManager.GET_PERMISSIONS)
      return info.requestedPermissions.orEmpty().contains(Manifest.permission.REQUEST_INSTALL_PACKAGES)
    }

    fun sha256Hex(file: File): String {
      val digest = MessageDigest.getInstance("SHA-256")
      file.inputStream().use { input ->
        val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
        while (true) {
          val read = input.read(buffer)
          if (read < 0) break
          digest.update(buffer, 0, read)
        }
      }
      return digest.digest().joinToString("") { "%02x".format(it) }
    }

    /**
     * Every certificate an APK vouches for: the ones it is signed with now and, after a key rotation, the ones before,
     * which Android accepts an update from.
     */
    fun signersOf(archive: PackageInfo): List<ByteArray>? {
      val info = archive.signingInfo ?: return null
      val current = info.apkContentsSigners.orEmpty().toList()
      val history = if (info.hasMultipleSigners()) emptyList() else info.signingCertificateHistory.orEmpty().toList()
      return (current + history).map { it.toByteArray() }
    }

    /**
     * Throws unless the APK is an update of this app: the same package, vouching for every certificate the installed
     * app is signed with.
     */
    fun checkArchive(archivePackage: String?, archiveSigners: List<ByteArray>?, installedSigners: List<ByteArray>, packageName: String) {
      if (archivePackage == null || archiveSigners == null) {
        throw UpdateException(SIGNATURE, "The download isn't an APK learnX can read")
      }
      if (archivePackage != packageName) {
        throw UpdateException(SIGNATURE, "The download is $archivePackage, not $packageName")
      }
      val signed = installedSigners.isNotEmpty() && installedSigners.all { installed -> archiveSigners.any { it.contentEquals(installed) } }
      if (!signed) {
        throw UpdateException(SIGNATURE, "The download isn't signed with learnX's key")
      }
    }

    fun statusOf(intent: Intent): InstallStatus {
      val message = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE)
      return when (val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)) {
        PackageInstaller.STATUS_PENDING_USER_ACTION -> InstallStatus.NeedsConfirmation(IntentCompat.getParcelableExtra(intent, Intent.EXTRA_INTENT, Intent::class.java))
        PackageInstaller.STATUS_SUCCESS -> InstallStatus.Done
        PackageInstaller.STATUS_FAILURE_ABORTED -> InstallStatus.Failed(CANCELLED, message ?: "The install was cancelled")
        else -> InstallStatus.Failed(FAILED, message ?: "The install failed ($status)")
      }
    }
  }
}

internal sealed interface InstallStatus {
  data class NeedsConfirmation(val intent: Intent?) : InstallStatus

  data object Done : InstallStatus

  data class Failed(val code: String, val message: String) : InstallStatus
}

internal class UpdateException(code: String, message: String) : CodedException(code, message, null)
