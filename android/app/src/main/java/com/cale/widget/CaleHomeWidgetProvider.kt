package com.cale.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.TypedValue
import android.view.View
import android.widget.RemoteViews
import com.cale.MainActivity
import com.cale.R

class CaleHomeWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray,
  ) {
    for (id in appWidgetIds) {
      updateAppWidget(context, appWidgetManager, id)
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
      val isOver = prefs.getBoolean(WidgetBridgeModule.KEY_IS_OVER, false)
      val hero = prefs.getString(WidgetBridgeModule.KEY_HERO, "—") ?: "—"
      val heroSub =
        prefs.getString(WidgetBridgeModule.KEY_HERO_SUB, "kcal left")
          ?: "kcal left"
      val eaten = prefs.getString(WidgetBridgeModule.KEY_EATEN, "0") ?: "0"
      val target = prefs.getString(WidgetBridgeModule.KEY_TARGET, "0") ?: "0"
      val streak = prefs.getString(WidgetBridgeModule.KEY_STREAK, "") ?: ""
      val dateLabel =
        prefs.getString(WidgetBridgeModule.KEY_DATE, "Today") ?: "Today"

      val options = appWidgetManager.getAppWidgetOptions(appWidgetId)
      val minHeight =
        options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 110)
      val minWidth =
        options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 250)

      // Wide + short: side panel beside calorie total.
      val isWideShort = minHeight < 110 && minWidth >= 200
      // Tall enough for stacked meta under the hero.
      val isTall = minHeight >= 110
      val isTiny = minWidth < 160 && minHeight < 90

      val views = RemoteViews(context.packageName, R.layout.widget_cale_home)
      val accent =
        context.getColor(
          if (isOver && ready) R.color.widget_chili else R.color.brand_primary,
        )

      views.setInt(
        R.id.widget_root,
        "setBackgroundResource",
        if (isOver && ready) {
          R.drawable.widget_background_over
        } else {
          R.drawable.widget_background
        },
      )

      views.setTextViewTextSize(
        R.id.widget_hero,
        TypedValue.COMPLEX_UNIT_SP,
        when {
          isTiny -> 22f
          isWideShort -> 26f
          else -> 32f
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

        when {
          isWideShort && !isTiny -> {
            views.setViewVisibility(R.id.widget_side_panel, View.VISIBLE)
            views.setViewVisibility(R.id.widget_meta_row, View.GONE)
            views.setViewVisibility(R.id.widget_streak_row, View.GONE)
            views.setViewVisibility(
              R.id.widget_side_streak_row,
              if (streak.isNotBlank()) View.VISIBLE else View.GONE,
            )
          }
          isTall -> {
            views.setViewVisibility(R.id.widget_side_panel, View.GONE)
            views.setViewVisibility(R.id.widget_meta_row, View.VISIBLE)
            views.setViewVisibility(
              R.id.widget_streak_row,
              if (streak.isNotBlank()) View.VISIBLE else View.GONE,
            )
            views.setViewVisibility(R.id.widget_side_streak_row, View.GONE)
          }
          else -> {
            // Tiny square: hero only.
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
