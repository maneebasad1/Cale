import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BrandLogo } from '../../components/BrandLogo';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { KeyboardAwareScreen } from '../../components/KeyboardAwareScreen';
import { Screen } from '../../components/Screen';
import { APP_TAGLINE } from '../../constants/branding';
import { isGoogleSignInConfigured, isSupabaseConfigured } from '../../config/supabase';
import { colors, fonts, radii, spacing, typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

type AuthStep = 'email' | 'otp';

const OTP_LENGTH = 8;
const RESEND_COOLDOWN_SEC = 60;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function AuthScreen() {
  const { sendEmailOtp, verifyEmailOtp, signInWithGoogle } = useAuth();
  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [resendSeconds]);

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

  const handleSendCode = async () => {
    setEmailError(null);
    setInfo(null);

    if (!isValidEmail(email)) {
      setEmailError('Enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const result = await sendEmailOtp(email);
      if (result.error) {
        setEmailError(result.error);
        return;
      }

      setStep('otp');
      setOtp('');
      setResendSeconds(RESEND_COOLDOWN_SEC);
      setInfo(`We sent a sign-in code to ${email.trim()}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setEmailError(null);
    setInfo(null);

    if (otp.trim().length !== OTP_LENGTH) {
      setEmailError(`Enter the ${OTP_LENGTH}-digit code from your email.`);
      return;
    }

    setLoading(true);
    try {
      const result = await verifyEmailOtp(email, otp);
      if (result.error) {
        setEmailError(result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendSeconds > 0 || loading) {
      return;
    }

    setEmailError(null);
    setInfo(null);
    setLoading(true);
    try {
      const result = await sendEmailOtp(email);
      if (result.error) {
        setEmailError(result.error);
        return;
      }

      setResendSeconds(RESEND_COOLDOWN_SEC);
      setInfo('A new code was sent to your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleError(null);
    setInfo(null);
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.error) {
        setGoogleError(result.error);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleChangeEmail = () => {
    setStep('email');
    setOtp('');
    setEmailError(null);
    setInfo(null);
    setResendSeconds(0);
  };

  return (
    <Screen>
      <KeyboardAwareScreen contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <BrandLogo size="lg" showTagline={false} />
          <Text style={styles.tagline}>{APP_TAGLINE}</Text>
        </View>

        <Text style={styles.title}>
          {step === 'email' ? 'Welcome to CALE' : 'Check your email'}
        </Text>
        <Text style={styles.subtitle}>
          {step === 'email'
            ? 'Enter your email and we’ll send you a one-time sign-in code. No password needed.'
            : `Enter the ${OTP_LENGTH}-digit code we sent to ${email.trim()}.`}
        </Text>

        <View style={styles.form}>
          {step === 'email' ? (
            <>
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
                  autoComplete="email"
                  textContentType="emailAddress"
                  accessibilityLabel="Email"
                />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.label}>Sign-in code</Text>
              <View style={styles.inputRow}>
                <Icon name="lock-closed-outline" size={18} color={colors.stone} />
                <TextInput
                  style={styles.otpInput}
                  value={otp}
                  onChangeText={(value) =>
                    setOtp(value.replace(/\D/g, '').slice(0, OTP_LENGTH))
                  }
                  placeholder="00000000"
                  placeholderTextColor={colors.stone}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  maxLength={OTP_LENGTH}
                  accessibilityLabel="Sign-in code"
                />
              </View>
              <TouchableOpacity
                onPress={handleChangeEmail}
                style={styles.changeEmailBtn}
                accessibilityRole="button"
                accessibilityLabel="Use a different email">
                <Text style={styles.changeEmailText}>Use a different email</Text>
              </TouchableOpacity>
            </>
          )}

          {emailError ? (
            <View style={styles.messageRow}>
              <Icon name="alert-circle-outline" size={16} color={colors.chili} />
              <Text style={styles.error}>{emailError}</Text>
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
            title={step === 'email' ? 'Continue' : 'Verify code'}
            onPress={step === 'email' ? handleSendCode : handleVerifyCode}
            loading={loading}
            style={styles.submitBtn}
          />

          {step === 'otp' ? (
            <TouchableOpacity
              onPress={handleResendCode}
              disabled={resendSeconds > 0 || loading}
              style={styles.resendBtn}
              accessibilityRole="button"
              accessibilityLabel="Resend code">
              <Text
                style={[
                  styles.resendText,
                  (resendSeconds > 0 || loading) && styles.resendDisabled,
                ]}>
                {resendSeconds > 0
                  ? `Resend code in ${resendSeconds}s`
                  : 'Resend code'}
              </Text>
            </TouchableOpacity>
          ) : null}

          {isGoogleSignInConfigured() && step === 'email' ? (
            <>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
              {googleError ? (
                <View style={styles.messageRow}>
                  <Icon
                    name="alert-circle-outline"
                    size={16}
                    color={colors.chili}
                  />
                  <Text style={styles.error}>{googleError}</Text>
                </View>
              ) : null}
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
          ) : null}
        </View>
      </KeyboardAwareScreen>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl * 2,
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
  otpInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: 4,
    color: colors.ink,
    paddingVertical: spacing.md,
  },
  changeEmailBtn: {
    alignSelf: 'flex-start',
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  changeEmailText: {
    ...typography.caption,
    color: colors.nori,
    fontFamily: fonts.bodyMedium,
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
  resendBtn: {
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
  },
  resendText: {
    ...typography.label,
    color: colors.nori,
  },
  resendDisabled: {
    color: colors.stone,
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
