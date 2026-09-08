import React, { useEffect, useState } from 'react';
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

export function RootNavigator() {
  const { isAuthenticated, isGuest, canUseApp, authLoading, user } = useAuth();
  const { onboardingComplete, refreshProfile } = useApp();
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

  // Keep loader up until this session's profile is ready (avoids onboarding flash).
  const awaitingProfile =
    canUseApp && !!sessionKey && bootstrappedKey !== sessionKey;

  if (authLoading || awaitingProfile) {
    return <BrandLoader />;
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
