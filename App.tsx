/**
 * CALE — Calorie Tracker
 *
 * @format
 */

import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/context/AppContext';
import { AuthProvider } from './src/context/AuthContext';
import { SyncProvider } from './src/context/SyncContext';
import { colors } from './src/constants/theme';
import { RootNavigator } from './src/navigation/RootNavigator';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.surface}
      />
      <AuthProvider>
        <SyncProvider>
          <AppProvider>
            <RootNavigator />
          </AppProvider>
        </SyncProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
