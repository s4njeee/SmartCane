import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { updateProfile, updateEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import { saveUserProfile } from '../firebase/appData';
import AppShell from '../components/AppShell';
import GlowPressable from '../components/ui/GlowPressable';
import ScreenLayout from '../components/ui/ScreenLayout';
import GlassCard from '../components/ui/GlassCard';
import ScreenHeader from '../components/ui/ScreenHeader';
import AppInput from '../components/ui/AppInput';
import AppButton from '../components/ui/AppButton';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../constants/theme';

export default function EditProfileScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { colors } = theme;
  const user = auth.currentUser;

  const [fullName, setFullName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gender, setGender] = useState('Male');
  const [age, setAge] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    if (!user) return;
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setFullName(data.displayName || '');
        setEmail(data.email || '');
        setPhoneNumber(data.phoneNumber || '');
        setGender(data.gender || 'Male');
        setAge(data.age || '');
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await updateProfile(user, { displayName: fullName });
      if (email !== user.email) await updateEmail(user, email);
      await saveUserProfile(user.uid, {
        displayName: fullName,
        email,
        phoneNumber,
        gender,
        age,
      });
      Alert.alert('Success', 'Profile updated successfully!');
      router.replace('/profile');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell active="profile">
    <ScreenLayout scroll withNav>
      <ScreenHeader title="Edit Profile" />

      <GlassCard>
        <AppInput label="Full name" value={fullName} onChangeText={setFullName} />
        <AppInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <AppInput label="Phone number" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
        <AppInput label="Age" value={age} onChangeText={setAge} keyboardType="numeric" />

        <Text style={[styles.genderLabel, { color: colors.textSecondary }]}>Gender</Text>
        <View style={styles.genderRow}>
          {['Male', 'Female', 'Other'].map((item) => (
            <GlowPressable
              key={item}
              onPress={() => setGender(item)}
              active={gender === item}
              glowColor={colors.primary}
              style={[
                styles.genderBtn,
                {
                  flex: 1,
                  backgroundColor: gender === item ? colors.primary : colors.inputBg,
                  borderRadius: radius.md,
                  marginHorizontal: 4,
                },
              ]}
            >
              <Text
                style={[
                  styles.genderText,
                  { color: gender === item ? '#fff' : colors.text },
                ]}
              >
                {item}
              </Text>
            </GlowPressable>
          ))}
        </View>
      </GlassCard>

      <AppButton title="Save Changes" onPress={handleSave} loading={loading} style={styles.save} />
    </ScreenLayout>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  genderLabel: { fontSize: 13, fontWeight: '600', marginBottom: 10, marginTop: 4 },
  genderRow: { flexDirection: 'row', marginBottom: 8 },
  genderBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  genderText: { fontSize: 14, fontWeight: '600' },
  save: { marginTop: spacing.lg, marginBottom: spacing.xxl },
});
