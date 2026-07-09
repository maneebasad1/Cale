import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BrandLogo } from '../../components/BrandLogo';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { APP_TAGLINE } from '../../constants/branding';
import { isGoogleSignInConfigured, isSupabaseConfigured } from '../../config/supabase';
import { colors, fonts, radii, spacing, typography } from '../../constants/theme';
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
          <BrandLogo size="lg" showTagline style={styles.setupLogo} />
          <View style={styles.setupCard}>
            <View style={styles.setupIconWrap}>
              <Icon name="alert-circle-outline" size={28} color={colors.saffron} />
            </View>
            <Text style={styles.setupTitle}>Almost ready</Text>
            <Text style={styles.setupText}>
              Add your project URL and anon key in src/config/supabase.ts, then
              run supabase/schema.sql in your Supabase dashboard.
            </Text>
          </View>
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

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setInfo(null);
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <BrandLogo size="lg" showTagline={false} />
            <Text style={styles.tagline}>{APP_TAGLINE}</Text>
          </View>

          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeOption, mode === 'signIn' && styles.modeActive]}
              onPress={() => switchMode('signIn')}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === 'signIn' }}>
              <Text
                style={[
                  styles.modeLabel,
                  mode === 'signIn' && styles.modeLabelActive,
                ]}>
                Sign in
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeOption, mode === 'signUp' && styles.modeActive]}
              onPress={() => switchMode('signUp')}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === 'signUp' }}>
              <Text
                style={[
                  styles.modeLabel,
                  mode === 'signUp' && styles.modeLabelActive,
                ]}>
                Sign up
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>
            {mode === 'signIn' ? 'Welcome back' : 'Create your account'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'signIn'
              ? 'Sign in to sync meals, goals, and progress across devices.'
              : 'Save your foods and targets so they follow you everywhere.'}
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputRow}>
              <Icon name="mail-outline" size={18} color={colors.stone} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.stone}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Email"
              />
            </View>

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <Icon name="lock-closed-outline" size={18} color={colors.stone} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.stone}
                secureTextEntry
                autoCapitalize="none"
                accessibilityLabel="Password"
              />
            </View>

            {error ? (
              <View style={styles.messageRow}>
                <Icon name="alert-circle-outline" size={16} color={colors.chili} />
                <Text style={styles.error}>{error}</Text>
              </View>
            ) : null}
            {info ? (
              <View style={styles.messageRow}>
                <Icon
                  name="checkmark-circle-outline"
                  size={16}
                  color={colors.nori}
                />
                <Text style={styles.info}>{info}</Text>
              </View>
            ) : null}

            <Button
              title={mode === 'signIn' ? 'Sign in' : 'Create account'}
              onPress={handleSubmit}
              loading={loading}
              style={styles.submitBtn}
            />

            {isGoogleSignInConfigured() && (
              <>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>
                <TouchableOpacity
                  style={[
                    styles.googleBtn,
                    (loading || googleLoading) && styles.googleDisabled,
                  ]}
                  onPress={handleGoogleSignIn}
                  disabled={loading || googleLoading}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Google">
                  {googleLoading ? (
                    <Text style={styles.googleText}>Connecting…</Text>
                  ) : (
                    <>
                      <Icon name="logo-google" size={18} color={colors.ink} />
                      <Text style={styles.googleText}>Continue with Google</Text>
                    </>
                  )}
                </TouchableOpacity>
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
    paddingVertical: spacing.xl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    alignItems: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  tagline: {
    ...typography.body,
    color: colors.stone,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: radii.sm,
    padding: 3,
    marginBottom: spacing.lg,
  },
  modeOption: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: 6,
  },
  modeActive: {
    backgroundColor: colors.surface,
  },
  modeLabel: {
    ...typography.label,
    color: colors.stone,
  },
  modeLabelActive: {
    color: colors.nori,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.3,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.stone,
    marginBottom: spacing.lg,
  },
  form: {
    backgroundColor: colors.porcelain,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  label: {
    ...typography.label,
    color: colors.stone,
    marginBottom: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.steam,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
    paddingVertical: spacing.md,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  error: {
    ...typography.caption,
    color: colors.chili,
    flex: 1,
  },
  info: {
    ...typography.caption,
    color: colors.nori,
    flex: 1,
  },
  submitBtn: {
    marginTop: spacing.xs,
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
    backgroundColor: colors.line,
  },
  dividerText: {
    ...typography.caption,
    color: colors.stone,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  googleDisabled: {
    opacity: 0.5,
  },
  googleText: {
    ...typography.label,
    fontSize: 16,
    color: colors.ink,
  },
  setupLogo: {
    marginBottom: spacing.xl,
  },
  setupCard: {
    width: '100%',
    backgroundColor: colors.porcelain,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  setupIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.saffronMute,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  setupTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.ink,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  setupText: {
    ...typography.body,
    color: colors.stone,
    textAlign: 'center',
  },
});
