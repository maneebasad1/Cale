import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BrandLogo } from '../../components/BrandLogo';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { isGoogleSignInConfigured, isSupabaseConfigured } from '../../config/supabase';
import { colors, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

type AuthMode = 'signIn' | 'signUp';

export function AuthScreen() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (!isSupabaseConfigured()) {
    return (
      <Screen>
        <View style={styles.centered}>
          <BrandLogo size="sm" layout="row" style={styles.logo} />
          <Text style={styles.setupTitle}>Supabase not configured</Text>
          <Text style={styles.setupText}>
            Add your project URL and anon key in src/config/supabase.ts, then
            run supabase/schema.sql in your Supabase dashboard.
          </Text>
        </View>
      </Screen>
    );
  }

  const handleSubmit = async () => {
    setError(null);
    setInfo(null);

    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const result =
        mode === 'signIn'
          ? await signIn(email, password)
          : await signUp(email, password);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (mode === 'signUp') {
        setInfo('Account created. Check your email if confirmation is required.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setInfo(null);
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.error) {
        setError(result.error);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled">
          <BrandLogo size="sm" layout="row" style={styles.logo} />
          <Text style={styles.title}>
            {mode === 'signIn' ? 'Welcome back' : 'Create your account'}
          </Text>
          <Text style={styles.subtitle}>
            Sign in to sync your meals, goals, and progress across devices.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              autoCapitalize="none"
            />

            {error && <Text style={styles.error}>{error}</Text>}
            {info && <Text style={styles.info}>{info}</Text>}

            <Button
              title={mode === 'signIn' ? 'Sign In' : 'Create Account'}
              onPress={handleSubmit}
              loading={loading}
              style={styles.submitBtn}
            />

            <Button
              title={
                mode === 'signIn'
                  ? 'Need an account? Sign up'
                  : 'Already have an account? Sign in'
              }
              variant="secondary"
              onPress={() => {
                setMode(mode === 'signIn' ? 'signUp' : 'signIn');
                setError(null);
                setInfo(null);
              }}
            />

            {isGoogleSignInConfigured() && (
              <>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>
                <Button
                  title="Continue with Google"
                  variant="secondary"
                  onPress={handleGoogleSignIn}
                  loading={googleLoading}
                  disabled={loading}
                />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  logo: {
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.md,
  },
  error: {
    color: colors.error,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  info: {
    color: colors.primary,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  submitBtn: {
    marginBottom: spacing.sm,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  setupTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  setupText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
