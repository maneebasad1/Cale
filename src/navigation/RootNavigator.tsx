import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BrandLoader } from '../components/BrandLoader';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { navigationRef } from '../navigation/navigationRef';
import { AuthScreen } from '../screens/auth/AuthScreen';
import {
  processInitialNotification,
  registerNotificationNavigationHandlers,
  setNotificationNavigationReady,
} from '../services/notificationNavigation';
import { MainNavigator } from './MainNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated, authLoading, user } = useAuth();
  const { onboardingComplete, refreshProfile } = useApp();
  /** User id whose profile bootstrap finished — null until first successful load. */
  const [bootstrappedUserId, setBootstrappedUserId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated || !user) {
      setBootstrappedUserId(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      await refreshProfile();
      if (!cancelled) {
        setBootstrappedUserId(user.id);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, user?.id, refreshProfile]);

  useEffect(() => {
    return registerNotificationNavigationHandlers();
  }, []);

  useEffect(() => {
    setNotificationNavigationReady(
      Boolean(bootstrappedUserId && onboardingComplete),
    );
  }, [bootstrappedUserId, onboardingComplete]);

  const handleNavigationReady = () => {
    void processInitialNotification().then(() => {
      setNotificationNavigationReady(
        Boolean(bootstrappedUserId && onboardingComplete),
      );
    });
  };

  // Keep loader up until this session's profile is ready (avoids onboarding flash).
  const awaitingProfile =
    isAuthenticated && !!user && bootstrappedUserId !== user.id;

  if (authLoading || awaitingProfile) {
    return <BrandLoader />;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={handleNavigationReady}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : onboardingComplete ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
