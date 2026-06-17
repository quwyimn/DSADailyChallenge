import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../App';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);
  const sessionExpired = useAuthStore((s) => s.sessionExpired);
  const setSessionExpired = useAuthStore((s) => s.setSessionExpired);
  const { t } = useLanguageStore();

  // Snapshot the flag once at mount so the banner stays visible for this
  // screen instance even after the global flag below is cleared — it must
  // only show when this screen was reached via a real 401 redirect, not on
  // every fresh open.
  const [showExpiredBanner, setShowExpiredBanner] = useState(sessionExpired);
  useEffect(() => {
    if (sessionExpired) setSessionExpired(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin() {
    setLoading(true);
    setLoginError(null);
    setShowExpiredBanner(false);
    try {
      const result = await authApi.login(email.trim(), password);
      setAuth(result.token, result.user);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 400) {
          setLoginError('Email không đúng định dạng hoặc mật khẩu quá ngắn.');
        } else if (status === 401) {
          setLoginError('Email hoặc mật khẩu không đúng. Vui lòng thử lại.');
        } else if (!err.response) {
          setLoginError('Không thể kết nối đến server.');
        } else {
          setLoginError('Đã có lỗi xảy ra. Vui lòng thử lại.');
        }
      } else {
        setLoginError('Đã có lỗi xảy ra. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Text style={styles.title}>DSA Daily Challenge</Text>

        {loginError ? (
          <ErrorBanner message={loginError} onDismiss={() => setLoginError(null)} />
        ) : showExpiredBanner ? (
          <ErrorBanner
            message="Session expired. Please log in again."
            onDismiss={() => setShowExpiredBanner(false)}
          />
        ) : null}

        <TextInput
          style={styles.input}
          placeholder={t('auth.login.email')}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder={t('auth.login.password')}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />

        {loading ? (
          <LoadingOverlay message={t('auth.login.loading')} />
        ) : (
          <TouchableOpacity style={styles.btn} onPress={handleLogin}>
            <Text style={styles.btnText}>{t('auth.login.button')}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>{t('auth.login.noAccount')}</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 32, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    fontSize: 16,
  },
  btn: {
    backgroundColor: '#4f87ff',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  link: { textAlign: 'center', color: '#4f87ff', fontSize: 15 },
});
