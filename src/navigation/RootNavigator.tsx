import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BrandLoader } from '../components/BrandLoader';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { colors, fonts } from '../constants/theme';
import { navigationRef } from '../navigation/navigationRef';
import { AuthScreen } from '../screens/auth/AuthScreen';
import {
  processInitialNotification,
  registerNotificationNavigationHandlers,
  setNotificationNavigationReady,
} from '../services/notificationNavigation';
import { recordAppLaunch } from '../services/reviewPrompt';
import { MainNavigator } from './MainNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const GUEST_BOOTSTRAP_KEY = 'guest';

function HydrationErrorScreen({
  onRetry,
  onContinue,
}: {
  onRetry: () => void;
  onContinue: () => void;
}) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Couldn't load your data</Text>
      <Text style={styles.errorBody}>
        Check your connection and try again. If you continue anyway, your
        saved data will load once you're back online.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.pressed,
        ]}>
        <Text style={styles.primaryButtonText}>Retry</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={onContinue}
        style={({ pressed }) => [
          styles.secondaryButton,
          pressed && styles.pressed,
        ]}>
        <Text style={styles.secondaryButtonText}>Continue anyway</Text>
      </Pressable>
    </View>
  );
}

export function RootNavigator() {
  const { isAuthenticated, isGuest, canUseApp, authLoading, user } = useAuth();
  const {
    profile,
    onboardingComplete,
    refreshProfile,
    hydrationStatus,
    retryHydration,
    continueWithoutHydration,
  } = useApp();
  /** Session key whose profile bootstrap finished — null until first successful load. */
  const [bootstrappedKey, setBootstrappedKey] = useState<string | null>(null);

  const sessionKey = user?.id ?? (isGuest ? GUEST_BOOTSTRAP_KEY : null);

  useEffect(() => {
    void recordAppLaunch();
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!sessionKey) {
      setBootstrappedKey(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      await refreshProfile();
      if (!cancelled) {
        setBootstrappedKey(sessionKey);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, sessionKey, refreshProfile]);

  useEffect(() => {
    return registerNotificationNavigationHandlers();
  }, []);

  useEffect(() => {
    setNotificationNavigationReady(
      Boolean(bootstrappedKey && onboardingComplete),
    );
  }, [bootstrappedKey, onboardingComplete]);

  const handleNavigationReady = () => {
    void processInitialNotification().then(() => {
      setNotificationNavigationReady(
        Boolean(bootstrappedKey && onboardingComplete),
      );
    });
  };

  // Guest signing in with data already on device: keep the navigator mounted
  // (no loader / remount) while the new session bootstraps in the background.
  const guestBecameUser =
    bootstrappedKey === GUEST_BOOTSTRAP_KEY &&
    !!sessionKey &&
    sessionKey !== GUEST_BOOTSTRAP_KEY &&
    profile !== null;

  // Keep loader up until this session's profile is ready (avoids onboarding flash).
  const awaitingProfile =
    canUseApp &&
    !!sessionKey &&
    bootstrappedKey !== sessionKey &&
    !guestBecameUser;

  if (authLoading || awaitingProfile || hydrationStatus === 'loading') {
    return <BrandLoader />;
  }

  if (canUseApp && hydrationStatus === 'failed') {
    return (
      <HydrationErrorScreen
        onRetry={() => void retryHydration()}
        onContinue={continueWithoutHydration}
      />
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={handleNavigationReady}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!canUseApp ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <>
            {onboardingComplete ? (
              <Stack.Screen name="Main" component={MainNavigator} />
            ) : (
              <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
            )}
            {isGuest && !isAuthenticated ? (
              <Stack.Screen
                name="Auth"
                component={AuthScreen}
                initialParams={{ intent: 'save' }}
                options={{
                  presentation: 'modal',
                  headerShown: true,
                  title: 'Save your progress',
                  headerStyle: { backgroundColor: colors.surface },
                  headerTintColor: colors.text,
                  headerTitleStyle: {
                    fontFamily: fonts.bodySemiBold,
                    fontSize: 17,
                  },
                  headerShadowVisible: false,
                }}
              />
            ) : null}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: colors.background,
  },
  errorTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    color: colors.text,
    marginBottom: 8,
  },
  errorBody: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: 28,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.surface,
  },
  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.text,
  },
  pressed: {
    opacity: 0.7,
  },
});
