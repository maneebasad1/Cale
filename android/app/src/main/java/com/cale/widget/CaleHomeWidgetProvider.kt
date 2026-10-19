package com.cale.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.TypedValue
import android.view.View
import android.widget.RemoteViews
import com.cale.MainActivity
import com.cale.R
import java.text.DateFormat
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class CaleHomeWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray,
  ) {
    for (id in appWidgetIds) {
      updateAppWidget(context, appWidgetManager, id)
    }
    scheduleMidnightRefresh(context)
  }

  override fun onEnabled(context: Context) {
    super.onEnabled(context)
    scheduleMidnightRefresh(context)
  }

  override fun onDisabled(context: Context) {
    super.onDisabled(context)
    cancelMidnightRefresh(context)
  }

  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      ACTION_MIDNIGHT_REFRESH,
      Intent.ACTION_DATE_CHANGED,
      Intent.ACTION_TIME_CHANGED,
      Intent.ACTION_TIMEZONE_CHANGED -> {
        refreshAll(context)
        scheduleMidnightRefresh(context)
      }
      else -> super.onReceive(context, intent)
    }
  }

  override fun onAppWidgetOptionsChanged(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int,
    newOptions: Bundle?,
  ) {
    updateAppWidget(context, appWidgetManager, appWidgetId)
  }

  companion object {
    const val ACTION_MIDNIGHT_REFRESH = "com.cale.widget.ACTION_MIDNIGHT_REFRESH"
    private const val MIDNIGHT_REQUEST_CODE = 4201

    private fun todayKey(): String =
      SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

    private fun yesterdayKey(): String {
      val cal = Calendar.getInstance()
      cal.add(Calendar.DAY_OF_YEAR, -1)
      return SimpleDateFormat("yyyy-MM-dd", Locale.US).format(cal.time)
    }

    private fun todayLabel(): String =
      DateFormat.getDateInstance(DateFormat.FULL, Locale.getDefault()).format(Date())

    private fun midnightPendingIntent(context: Context): PendingIntent {
      val intent =
        Intent(context, CaleHomeWidgetProvider::class.java).apply {
          action = ACTION_MIDNIGHT_REFRESH
        }
      return PendingIntent.getBroadcast(
        context,
        MIDNIGHT_REQUEST_CODE,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }

    /**
     * Inexact, non-wakeup alarm shortly after the next local midnight so the
     * widget rolls over to a fresh day even if the app isn't opened.
     * (ACTION_DATE_CHANGED is not delivered to manifest receivers on API 26+.)
     */
    fun scheduleMidnightRefresh(context: Context) {
      val alarmManager =
        context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
      val next =
        Calendar.getInstance().apply {
          add(Calendar.DAY_OF_YEAR, 1)
          set(Calendar.HOUR_OF_DAY, 0)
          set(Calendar.MINUTE, 1)
          set(Calendar.SECOND, 0)
          set(Calendar.MILLISECOND, 0)
        }
      alarmManager.set(AlarmManager.RTC, next.timeInMillis, midnightPendingIntent(context))
    }

    fun cancelMidnightRefresh(context: Context) {
      val alarmManager =
        context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
      alarmManager.cancel(midnightPendingIntent(context))
    }

    fun refreshAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids =
        manager.getAppWidgetIds(ComponentName(context, CaleHomeWidgetProvider::class.java))
      for (id in ids) {
        updateAppWidget(context, manager, id)
      }
    }

    private fun applyTypography(views: RemoteViews, type: WidgetTypography) {
      views.setTextViewTextSize(R.id.widget_brand, TypedValue.COMPLEX_UNIT_SP, type.brand)
      views.setTextViewTextSize(R.id.widget_date, TypedValue.COMPLEX_UNIT_SP, type.date)
      views.setTextViewTextSize(R.id.widget_hero, TypedValue.COMPLEX_UNIT_SP, type.hero)
      views.setTextViewTextSize(R.id.widget_hero_sub, TypedValue.COMPLEX_UNIT_SP, type.heroSub)
      views.setTextViewTextSize(R.id.widget_eaten, TypedValue.COMPLEX_UNIT_SP, type.meta)
      views.setTextViewTextSize(R.id.widget_target, TypedValue.COMPLEX_UNIT_SP, type.meta)
      views.setTextViewTextSize(R.id.widget_streak, TypedValue.COMPLEX_UNIT_SP, type.streak)
      views.setTextViewTextSize(R.id.widget_side_eaten, TypedValue.COMPLEX_UNIT_SP, type.meta)
      views.setTextViewTextSize(R.id.widget_side_target, TypedValue.COMPLEX_UNIT_SP, type.meta)
      views.setTextViewTextSize(R.id.widget_side_streak, TypedValue.COMPLEX_UNIT_SP, type.streak)

      views.setViewVisibility(
        R.id.widget_brand_icon,
        if (type.showHeader && type.showHeroIcon) View.VISIBLE else View.GONE,
      )
      views.setViewVisibility(R.id.widget_brand, if (type.showHeader) View.VISIBLE else View.GONE)
      views.setViewVisibility(R.id.widget_date, if (type.showHeader) View.VISIBLE else View.GONE)
      views.setViewVisibility(
        R.id.widget_hero_icon,
        if (type.showHeroIcon) View.VISIBLE else View.GONE,
      )
      views.setViewVisibility(
        R.id.widget_hero_sub,
        if (type.showHeroSub) View.VISIBLE else View.GONE,
      )
      views.setViewVisibility(
        R.id.widget_eaten_icon,
        if (type.showMetaIcons) View.VISIBLE else View.GONE,
      )
      views.setViewVisibility(
        R.id.widget_target_icon,
        if (type.showMetaIcons) View.VISIBLE else View.GONE,
      )
      views.setViewVisibility(
        R.id.widget_streak_icon,
        if (type.showMetaIcons) View.VISIBLE else View.GONE,
      )
    }

    fun updateAppWidget(
      context: Context,
      appWidgetManager: AppWidgetManager,
      appWidgetId: Int,
    ) {
      val prefs =
        context.getSharedPreferences(
          WidgetBridgeModule.PREFS_NAME,
          Context.MODE_PRIVATE,
        )
      val ready = prefs.getBoolean(WidgetBridgeModule.KEY_READY, false)
      var isOver = prefs.getBoolean(WidgetBridgeModule.KEY_IS_OVER, false)
      var hero = prefs.getString(WidgetBridgeModule.KEY_HERO, "—") ?: "—"
      var heroSub =
        prefs.getString(WidgetBridgeModule.KEY_HERO_SUB, "kcal left")
          ?: "kcal left"
      var eaten = prefs.getString(WidgetBridgeModule.KEY_EATEN, "0") ?: "0"
      var target = prefs.getString(WidgetBridgeModule.KEY_TARGET, "0") ?: "0"
      var streak = prefs.getString(WidgetBridgeModule.KEY_STREAK, "") ?: ""
      var dateLabel =
        prefs.getString(WidgetBridgeModule.KEY_DATE, "Today") ?: "Today"
      val snapshotDateKey = prefs.getString(WidgetBridgeModule.KEY_DATE_KEY, "") ?: ""

      // Snapshot is from a previous day (app not opened since midnight):
      // render a fresh "today" instead of yesterday's numbers.
      val today = todayKey()
      if (snapshotDateKey.isNotEmpty() && snapshotDateKey != today) {
        dateLabel = todayLabel()
        if (ready) {
          val targetValue = prefs.getLong(WidgetBridgeModule.KEY_TARGET_VALUE, 0L)
          val numberFormat = NumberFormat.getIntegerInstance()
          isOver = false
          hero = numberFormat.format(targetValue)
          heroSub = "kcal left"
          eaten = "0"
          target = numberFormat.format(targetValue)
          // Streak still counts today only if the snapshot day was yesterday
          // and something was logged on it.
          val streakCount = prefs.getInt(WidgetBridgeModule.KEY_STREAK_COUNT, 0)
          val loggedOnSnapshotDay =
            prefs.getBoolean(WidgetBridgeModule.KEY_LOGGED_TODAY, false)
          streak =
            if (snapshotDateKey == yesterdayKey() && loggedOnSnapshotDay && streakCount > 0) {
              "$streakCount-day streak"
            } else {
              "Log today to start a streak"
            }
        }
      }

      val options = appWidgetManager.getAppWidgetOptions(appWidgetId)
      val (widthDp, heightDp) = WidgetLayout.currentSizeDp(options)
      val mode = WidgetLayout.layoutMode(widthDp, heightDp)
      val typography = WidgetLayout.typography(widthDp, heightDp, mode)

      val views = RemoteViews(context.packageName, R.layout.widget_cale_home)
      val accent =
        context.getColor(
          if (isOver && ready) R.color.widget_chili else R.color.brand_primary,
        )

      applyTypography(views, typography)

      views.setInt(
        R.id.widget_root,
        "setBackgroundResource",
        if (isOver && ready) {
          R.drawable.widget_background_over
        } else {
          R.drawable.widget_background
        },
      )

      views.setTextViewText(R.id.widget_date, dateLabel)

      if (!ready) {
        views.setTextViewText(R.id.widget_hero, "CALE")
        views.setTextViewText(R.id.widget_hero_sub, "Open app to start")
        views.setTextColor(R.id.widget_hero, accent)
        views.setTextColor(R.id.widget_hero_sub, accent)
        views.setImageViewResource(R.id.widget_hero_icon, R.drawable.ic_widget_bowl)
        views.setViewVisibility(R.id.widget_side_panel, View.GONE)
        views.setViewVisibility(R.id.widget_meta_row, View.GONE)
        views.setViewVisibility(R.id.widget_streak_row, View.GONE)
        views.setViewVisibility(R.id.widget_side_streak_row, View.GONE)
      } else {
        views.setTextViewText(R.id.widget_hero, hero)
        views.setTextViewText(R.id.widget_hero_sub, heroSub)
        views.setTextColor(R.id.widget_hero, accent)
        views.setTextColor(R.id.widget_hero_sub, accent)
        views.setViewVisibility(
          R.id.widget_hero_sub,
          if (mode.isTiny) View.GONE else View.VISIBLE,
        )
        views.setImageViewResource(
          R.id.widget_hero_icon,
          if (isOver) R.drawable.ic_widget_flag else R.drawable.ic_widget_bowl,
        )

        val eatenLabel = "$eaten eaten"
        val targetLabel = "$target target"
        views.setTextViewText(R.id.widget_eaten, eatenLabel)
        views.setTextViewText(R.id.widget_target, targetLabel)
        views.setTextViewText(R.id.widget_side_eaten, eatenLabel)
        views.setTextViewText(R.id.widget_side_target, targetLabel)
        views.setTextViewText(R.id.widget_streak, streak)
        views.setTextViewText(R.id.widget_side_streak, streak)

        val showStreak = WidgetLayout.streakVisible(heightDp, streak)

        when {
          mode.isWideShort -> {
            views.setViewVisibility(R.id.widget_side_panel, View.VISIBLE)
            views.setViewVisibility(R.id.widget_meta_row, View.GONE)
            views.setViewVisibility(R.id.widget_streak_row, View.GONE)
            views.setViewVisibility(
              R.id.widget_side_streak_row,
              if (showStreak) View.VISIBLE else View.GONE,
            )
          }
          mode.isTall -> {
            views.setViewVisibility(R.id.widget_side_panel, View.GONE)
            views.setViewVisibility(R.id.widget_meta_row, View.VISIBLE)
            views.setViewVisibility(
              R.id.widget_streak_row,
              if (showStreak) View.VISIBLE else View.GONE,
            )
            views.setViewVisibility(R.id.widget_side_streak_row, View.GONE)
          }
          else -> {
            views.setViewVisibility(R.id.widget_side_panel, View.GONE)
            views.setViewVisibility(R.id.widget_meta_row, View.GONE)
            views.setViewVisibility(R.id.widget_streak_row, View.GONE)
            views.setViewVisibility(R.id.widget_side_streak_row, View.GONE)
          }
        }
      }

      val launchIntent =
        Intent(context, MainActivity::class.java).apply {
          flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
          putExtra("widget_action", "home")
        }
      val pendingIntent =
        PendingIntent.getActivity(
          context,
          appWidgetId,
          launchIntent,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
      views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

      appWidgetManager.updateAppWidget(appWidgetId, views)
    }
  }
}
