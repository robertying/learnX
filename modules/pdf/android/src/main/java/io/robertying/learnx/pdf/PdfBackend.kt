package io.robertying.learnx.pdf

import android.os.Build
import android.os.ext.SdkExtensions

/** What draws a PDF on this device. */
enum class PdfBackend {
  /** Jetpack's `PdfView`, rendering in an isolated process. */
  JETPACK,

  /** AndroidPdfViewer on Pdfium, in the app's process. */
  PDFIUM;

  companion object {
    /**
     * Jetpack where it renders with the platform's newer PDF renderer: Android 15, or Android 11 with the S extension
     * 13 that brings that renderer as a module update. Elsewhere Jetpack falls back to the old `PdfRenderer`, which
     * lays out landscape pages at the wrong size and leaves the first ones blank, so Pdfium draws them.
     */
    fun of(sdk: Int, sExtension: Int): PdfBackend =
      if (sdk >= Build.VERSION_CODES.VANILLA_ICE_CREAM || (sdk >= Build.VERSION_CODES.R && sExtension >= 13)) {
        JETPACK
      } else {
        PDFIUM
      }

    fun forDevice(): PdfBackend {
      val sdk = Build.VERSION.SDK_INT
      val sExtension = if (sdk >= Build.VERSION_CODES.R) SdkExtensions.getExtensionVersion(Build.VERSION_CODES.S) else 0
      return of(sdk, sExtension)
    }
  }
}
