import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BrandLogo } from '../components/BrandLogo';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../constants/theme';
import { AuthScreen } from '../screens/auth/AuthScreen';
import { MainNavigator } from './MainNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated, authLoading } = useAuth();
  const { onboardingComplete, refreshProfile } = useApp();
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!isAuthenticated) {
      setDataLoading(false);
      return;
    }
    refreshProfile().finally(() => setDataLoading(false));
  }, [authLoading, isAuthenticated, refreshProfile]);

  if (authLoading || (isAuthenticated && dataLoading)) {
    return (
      <View style={styles.loading}>
        <BrandLogo size="lg" showTagline />
      </View>
    );
  }

  return (
    <NavigationContainer>
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

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
});
