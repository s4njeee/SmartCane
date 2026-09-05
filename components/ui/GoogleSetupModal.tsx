import React, { useState } from 'react';
import {
  Linking,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { radius, spacing } from '../../constants/theme';
import { getGoogleRedirectUrisForSetup } from '../../constants/googleAuth';
import { isValidGoogleClientId, saveGoogleWebClientId } from '../../utils/googleClientStore';
import AppButton from './AppButton';
import GlassCard from './GlassCard';

const FIREBASE_GOOGLE_URL =
  'https://console.firebase.google.com/project/smartcane-ddedd/authentication/providers';

const GOOGLE_CLOUD_URL =
  'https://console.cloud.google.com/apis/credentials?project=smartcane-ddedd';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: (clientId: string) => void;
};

export default function GoogleSetupModal({ visible, onClose, onSaved }: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const [clientId, setClientId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!isValidGoogleClientId(clientId)) {
      setError('Paste the full Web Client ID (ends with .apps.googleusercontent.com).');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await saveGoogleWebClientId(clientId.trim());
      onSaved(clientId.trim());
      onClose();
    } catch (e: any) {
      setError(e.message || 'Could not save client ID.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <GlassCard style={styles.card}>
          <Text style={[styles.title, { color: colors.text }]}>Connect Google Sign-In</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            One-time setup (free, no billing):
          </Text>
          <Text style={[styles.step, { color: colors.textSecondary }]}>
            1. Open Firebase → Authentication → Google → Enable
          </Text>
          <Text style={[styles.step, { color: colors.textSecondary }]}>
            2. Copy the Web client ID
          </Text>
          <Text style={[styles.step, { color: colors.textSecondary }]}>
            3. In Google Cloud OAuth, add these redirect URIs:{'\n'}
            {getGoogleRedirectUrisForSetup().map((uri) => (
              <Text key={uri} style={{ color: colors.primary }}>
                {uri}
                {'\n'}
              </Text>
            ))}
          </Text>

          <AppButton
            title="Open Firebase Google Settings"
            variant="secondary"
            onPress={() => Linking.openURL(FIREBASE_GOOGLE_URL)}
            style={styles.linkBtn}
          />
          <AppButton
            title="Open Google Cloud Credentials"
            variant="ghost"
            onPress={() => Linking.openURL(GOOGLE_CLOUD_URL)}
            style={styles.linkBtn}
          />

          <TextInput
            value={clientId}
            onChangeText={(text) => {
              setClientId(text);
              setError('');
            }}
            placeholder="461252608555-xxxx.apps.googleusercontent.com"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.inputBg,
              },
            ]}
          />
          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

          <AppButton title="Save & Continue" onPress={handleSave} loading={saving} />
          <AppButton title="Cancel" variant="ghost" onPress={onClose} style={styles.cancelBtn} />
        </GlassCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: { padding: spacing.md },
  title: { fontSize: 20, fontWeight: '800', marginBottom: spacing.sm },
  body: { fontSize: 14, marginBottom: spacing.sm, lineHeight: 20 },
  step: { fontSize: 13, lineHeight: 20, marginBottom: 6 },
  linkBtn: { marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginTop: spacing.md,
    marginBottom: 8,
  },
  error: { fontSize: 13, marginBottom: 8 },
  cancelBtn: { marginTop: 8 },
});