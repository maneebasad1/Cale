package com.cale.widget

import android.appwidget.AppWidgetManager
import android.os.Bundle
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * Typography + spacing derived from the widget's current size (dp).
 * Reference: ~220×110 dp (typical 2×2 placement).
 */
internal data class WidgetTypography(
  val hero: Float,
  val heroSub: Float,
  val brand: Float,
  val date: Float,
  val meta: Float,
  val streak: Float,
  val showHeader: Boolean,
  val showHeroSub: Boolean,
  val showHeroIcon: Boolean,
  val showMetaIcons: Boolean,
)

internal data class WidgetLayoutMode(
  val widthDp: Int,
  val heightDp: Int,
  val isWideShort: Boolean,
  val isTall: Boolean,
  val isTiny: Boolean,
)

internal object WidgetLayout {
  private const val REF_WIDTH_DP = 220
  private const val REF_HEIGHT_DP = 110
  private const val MIN_SCALE = 0.58f
  private const val MAX_SCALE = 1.0f
  /** Hide all streak UI below this height. */
  private const val STREAK_MIN_HEIGHT_DP = 72
  /** "Log today to start a streak" only on taller widgets. */
  private const val STREAK_PROMPT_MIN_HEIGHT_DP = 100

  /**
   * Best-effort current widget size. Launchers report sizes inconsistently:
   * sometimes only MIN_* is set, sometimes MIN/MAX bracket the current span.
   */
  fun currentSizeDp(options: Bundle): Pair<Int, Int> {
    val minW = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
    val minH = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0)
    val maxW = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, 0)
    val maxH = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0)

    val width = resolveDimension(minW, maxW, REF_WIDTH_DP)
    val height = resolveDimension(minH, maxH, REF_HEIGHT_DP)
    return width to height
  }

  private fun resolveDimension(min: Int, max: Int, default: Int): Int {
    val resolved =
      when {
        min > 0 && max > 0 -> max(min, (min + max) / 2)
        min > 0 -> min
        max > 0 -> max
        else -> default
      }
    // Some launchers only report the resize floor (e.g. 40dp) without max — not the real height.
    if (max == 0 && min in 1 until 72) {
      return default
    }
    return resolved
  }

  fun layoutMode(widthDp: Int, heightDp: Int): WidgetLayoutMode {
    val isTiny = widthDp < 140 || heightDp < 48
    // Wide + short strip: stats beside the hero.
    val isWideShort = !isTiny && heightDp < 88 && widthDp >= 160
    // Full / tall widget: hero on top, meta + streak stacked below.
    val isTall = !isTiny && !isWideShort
    return WidgetLayoutMode(
      widthDp = widthDp,
      heightDp = heightDp,
      isWideShort = isWideShort,
      isTall = isTall,
      isTiny = isTiny,
    )
  }

  fun typography(widthDp: Int, heightDp: Int, mode: WidgetLayoutMode): WidgetTypography {
    val widthScale = (widthDp.toFloat() / REF_WIDTH_DP).coerceIn(MIN_SCALE, MAX_SCALE)
    val heightScale = (heightDp.toFloat() / REF_HEIGHT_DP).coerceIn(MIN_SCALE, MAX_SCALE)
    val scale = min(widthScale, heightScale)

    fun sp(base: Float, floor: Float): Float =
      max(base * scale, floor).roundToInt().toFloat()

    return WidgetTypography(
      hero = sp(32f, 14f),
      heroSub = sp(12f, 9f),
      brand = sp(13f, 9f),
      date = sp(12f, 8f),
      meta = sp(12f, 8f),
      streak = sp(12f, 8f),
      showHeader = !mode.isTiny && heightDp >= 52,
      showHeroSub = !mode.isTiny,
      showHeroIcon = !mode.isTiny && widthDp >= 110,
      showMetaIcons = mode.isTall && widthDp >= 160,
    )
  }

  /** Whether streak chip/row should be visible for this size and streak copy. */
  fun streakVisible(heightDp: Int, streak: String): Boolean {
    if (streak.isBlank()) {
      return false
    }
    if (heightDp < STREAK_MIN_HEIGHT_DP) {
      return false
    }
    if (streak.contains("Log today", ignoreCase = true)) {
      return heightDp >= STREAK_PROMPT_MIN_HEIGHT_DP
    }
    return true
  }
}
