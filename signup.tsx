import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebase/firebaseConfig';

export default function SignupScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fullNameAnim = useRef(new Animated.Value(0)).current;
  const phoneAnim = useRef(new Animated.Value(0)).current;
  const emailAnim = useRef(new Animated.Value(0)).current;
  const passwordAnim = useRef(new Animated.Value(0)).current;
  const confirmPasswordAnim = useRef(new Animated.Value(0)).current;

  const animateLabel = (anim: Animated.Value, focused: boolean) => {
    Animated.timing(anim, {
      toValue: focused ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  };

  const handleSignup = async () => {
    if (!fullName || !phoneNumber || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (phoneNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      Alert.alert('Success', `Welcome ${fullName}!`);
      router.replace('../home');
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message);
    }
  };

  const getLabelStyle = (anim: Animated.Value) => ({
    top: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 8] }),
    fontSize: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 12] }),
    color: anim.interpolate({ inputRange: [0, 1], outputRange: ['#666', '#0057FF'] }),
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            <Image source={require('../assets/images/SmartGuide.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>Create Account</Text>

            {/* FULL NAME */}
            <View style={styles.inputContainer}>
              <Animated.Text style={[styles.label, getLabelStyle(fullNameAnim)]}>Full Name</Animated.Text>
              <TextInput style={styles.inputBox} value={fullName} onChangeText={setFullName} onFocus={() => animateLabel(fullNameAnim, true)} onBlur={() => { if (!fullName) animateLabel(fullNameAnim, false); }} />
            </View>

            {/* PHONE */}
            <View style={styles.inputContainer}>
              <Animated.Text style={[styles.label, getLabelStyle(phoneAnim)]}>Phone Number</Animated.Text>
              <TextInput style={styles.inputBox} value={phoneNumber} keyboardType="phone-pad" onChangeText={setPhoneNumber} onFocus={() => animateLabel(phoneAnim, true)} onBlur={() => { if (!phoneNumber) animateLabel(phoneAnim, false); }} />
            </View>

            {/* EMAIL */}
            <View style={styles.inputContainer}>
              <Animated.Text style={[styles.label, getLabelStyle(emailAnim)]}>example@gmail.com</Animated.Text>
              <TextInput style={styles.inputBox} value={email} keyboardType="email-address" autoCapitalize="none" onChangeText={setEmail} onFocus={() => animateLabel(emailAnim, true)} onBlur={() => { if (!email) animateLabel(emailAnim, false); }} />
            </View>

            {/* PASSWORD */}
            <View style={styles.inputContainer}>
              <Animated.Text style={[styles.label, getLabelStyle(passwordAnim)]}>Create a Password</Animated.Text>
              <TextInput style={styles.inputBox} secureTextEntry={!showPassword} value={password} onChangeText={setPassword} onFocus={() => animateLabel(passwordAnim, true)} onBlur={() => { if (!password) animateLabel(passwordAnim, false); }} />
              <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={24} color="#0057FF" />
              </TouchableOpacity>
            </View>

            {/* CONFIRM PASSWORD */}
            <View style={styles.inputContainer}>
              <Animated.Text style={[styles.label, getLabelStyle(confirmPasswordAnim)]}>Confirm Password</Animated.Text>
              <TextInput style={styles.inputBox} secureTextEntry={!showConfirmPassword} value={confirmPassword} onChangeText={setConfirmPassword} onFocus={() => animateLabel(confirmPasswordAnim, true)} onBlur={() => { if (!confirmPassword) animateLabel(confirmPasswordAnim, false); }} />
              <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons name={showConfirmPassword ? 'eye' : 'eye-off'} size={24} color="#0057FF" />
              </TouchableOpacity>
            </View>

            {/* SIGN UP */}
            <TouchableOpacity style={styles.button} onPress={handleSignup}>
              <Text style={styles.buttonText}>Sign Up</Text>
            </TouchableOpacity>

            {/* CONTINUE WITH */}
            <View style={styles.dividerContainer}>
              <View style={styles.line} />
              <Text style={styles.orText}>or continue with</Text>
              <View style={styles.line} />
            </View>

            {/* GOOGLE BUTTON */}
            <View style={styles.socialContainer}>
              <TouchableOpacity style={styles.socialButton}>
                <Image source={require('../assets/images/google.png')} style={{ width: 30, height: 30 }} />
                <Text style={styles.socialText}>Google</Text>
              </TouchableOpacity>
            </View>

            {/* SIGN IN */}
            <TouchableOpacity style={styles.signInButton} onPress={() => router.replace('/login')}>
              <Text style={styles.signInText}>Already have an account? Log in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1 },
  container: { flex: 1, backgroundColor: '#eaf1ff', justifyContent: 'center', padding: 25, minHeight: '100%' },
  logo: { width: 300, height: 180, alignSelf: 'center' },
  title: { color: '#0057FF', fontSize: 28, fontWeight: 'bold', marginBottom: 30, textAlign: 'center' },
  inputContainer: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 15, paddingHorizontal: 15, height: 60, justifyContent: 'center', elevation: 2 },
  label: { position: 'absolute', left: 15 },
  inputBox: { paddingTop: 18, fontSize: 16 },
  eyeIcon: { position: 'absolute', right: 15, top: 18 },
  button: { backgroundColor: '#0057FF', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 25, marginBottom: 20 },
  line: { flex: 1, height: 1, backgroundColor: '#ddd' },
  orText: { marginHorizontal: 10, color: '#888', fontSize: 14 },
  socialContainer: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 14 },

  socialButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#fff',
  paddingVertical: 12,
  width: '100%',
  borderRadius: 12,
  elevation: 2,
},
  socialText: { marginLeft: 8, fontWeight: 'bold', color: '#333' , fontSize: 17},
  signInButton: { marginTop: 10, alignItems: 'center', marginBottom: 20 },
  signInText: { color: '#343434', fontSize: 15 },
});