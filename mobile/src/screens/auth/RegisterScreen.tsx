import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../App';
import { authApi, classesApi, ClassItem } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';
import { useApi } from '../../hooks/useApi';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [classId, setClassId] = useState<number | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);

  const setAuth = useAuthStore((s) => s.setAuth);
  const { t } = useLanguageStore();
  const { loading, error, execute, clearError } = useApi<Awaited<ReturnType<typeof authApi.register>>>();

  useEffect(() => {
    classesApi.list().then(setClasses).catch(() => {});
  }, []);

  async function handleRegister() {
    const result = await execute(() =>
      authApi.register(email.trim(), password, name.trim(), classId ?? undefined),
    );
    if (result) {
      setAuth(result.token, result.user);
      useAuthStore.getState().setIsNewUser(true);
    }
  }

  return (
    <ScreenWrapper padded={false} showBack backFallbackRoute="Login">
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('auth.register.title')}</Text>

        {error ? <ErrorBanner message={error} onDismiss={clearError} /> : null}

        <TextInput style={styles.input} placeholder={t('auth.register.name')} value={name} onChangeText={setName} editable={!loading} />
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
          placeholder={t('auth.register.passwordHint')}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />

        {classes.length > 0 ? (
          <View>
            <Text style={styles.label}>{t('auth.register.class')}</Text>
            {classes.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.classOption, classId === c.id && styles.classSelected]}
                onPress={() => setClassId(c.id)}
                disabled={loading}
              >
                <Text style={classId === c.id ? styles.classTextSelected : styles.classText}>
                  {c.name} — {c.grade}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {loading ? (
          <LoadingOverlay message={t('auth.register.loading')} />
        ) : (
          <TouchableOpacity style={styles.btn} onPress={handleRegister}>
            <Text style={styles.btnText}>{t('auth.register.button')}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>{t('auth.register.haveAccount')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 24, textAlign: 'center' },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 14, marginBottom: 14, fontSize: 16,
  },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  classOption: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 12, marginBottom: 8,
  },
  classSelected: { borderColor: '#4f87ff', backgroundColor: '#eef3ff' },
  classText: { fontSize: 15, color: '#333' },
  classTextSelected: { fontSize: 15, color: '#4f87ff', fontWeight: '600' },
  btn: {
    backgroundColor: '#4f87ff', borderRadius: 10,
    padding: 16, alignItems: 'center', marginTop: 16, marginBottom: 14,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  link: { textAlign: 'center', color: '#4f87ff', fontSize: 15 },
});
