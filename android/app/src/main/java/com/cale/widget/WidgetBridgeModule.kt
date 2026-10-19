package com.cale.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = WidgetBridgeModule.NAME)
class WidgetBridgeModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = NAME

  @ReactMethod
  fun updateSnapshot(data: ReadableMap, promise: Promise) {
    try {
      val prefs =
        reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      prefs
        .edit()
        .putString(KEY_HERO, data.getStringOrEmpty("hero"))
        .putString(KEY_HERO_SUB, data.getStringOrEmpty("heroSub"))
        .putString(KEY_EATEN, data.getStringOrEmpty("eaten"))
        .putString(KEY_TARGET, data.getStringOrEmpty("target"))
        .putString(KEY_STREAK, data.getStringOrEmpty("streak"))
        .putString(KEY_DATE, data.getStringOrEmpty("dateLabel"))
        .putBoolean(KEY_IS_OVER, data.hasKey("isOver") && data.getBoolean("isOver"))
        .putBoolean(KEY_READY, data.hasKey("ready") && data.getBoolean("ready"))
        .putString(KEY_DATE_KEY, data.getStringOrEmpty("dateKey"))
        .putLong(KEY_TARGET_VALUE, data.getNumberOrZero("targetValue").toLong())
        .putInt(KEY_STREAK_COUNT, data.getNumberOrZero("streakCount").toInt())
        .putBoolean(
          KEY_LOGGED_TODAY,
          data.hasKey("loggedToday") && data.getBoolean("loggedToday"),
        )
        .apply()

      refreshWidgets(reactContext)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("WIDGET_UPDATE_FAILED", error)
    }
  }

  companion object {
    const val NAME = "WidgetBridge"
    const val PREFS_NAME = "cale_widget"
    const val KEY_HERO = "hero"
    const val KEY_HERO_SUB = "heroSub"
    const val KEY_EATEN = "eaten"
    const val KEY_TARGET = "target"
    const val KEY_STREAK = "streak"
    const val KEY_DATE = "dateLabel"
    const val KEY_IS_OVER = "isOver"
    const val KEY_READY = "ready"
    const val KEY_DATE_KEY = "dateKey"
    const val KEY_TARGET_VALUE = "targetValue"
    const val KEY_STREAK_COUNT = "streakCount"
    const val KEY_LOGGED_TODAY = "loggedToday"

    fun refreshWidgets(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids =
        manager.getAppWidgetIds(
          ComponentName(context, CaleHomeWidgetProvider::class.java),
        )
      if (ids.isEmpty()) {
        return
      }
      val intent =
        Intent(context, CaleHomeWidgetProvider::class.java).apply {
          action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
          putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        }
      context.sendBroadcast(intent)
    }
  }
}

private fun ReadableMap.getStringOrEmpty(key: String): String =
  if (hasKey(key) && !isNull(key)) getString(key) ?: "" else ""

private fun ReadableMap.getNumberOrZero(key: String): Double =
  if (hasKey(key) && !isNull(key)) getDouble(key) else 0.0
