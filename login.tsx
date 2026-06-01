import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert, } from 'react-native';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword, sendPasswordResetEmail,} from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';
import { getAuth } from "firebase/auth";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] =
    useState('');
  const [password, setPassword] =
    useState('');

  // =========================
  // SIGN IN
  // =========================
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(
        'Error',
        'Please enter email and password.'
      );
      return;
    }

    try {
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      Alert.alert(
        'Success',
        'Login successful!'
      );

      router.replace('/home');
    } catch (error: any) {
      if (
        error.code ===
        'auth/invalid-credential'
      ) {
        Alert.alert(
          'Login Failed',
          'Incorrect email or password.'
        );
      } else {
        Alert.alert(
          'Login Failed',
          error.message
        );
      }
    }
  };

  // =========================
  // FORGOT PASSWORD
  // =========================
  const handleForgotPassword =
    async () => {
      if (!email) {
        Alert.alert(
          'Enter Email',
          'Please enter your email first.'
        );
        return;
      }

      try {
        await sendPasswordResetEmail(
          auth,
          email
        );

        Alert.alert(
          'Password Reset',
          'A password reset link has been sent to your email.'
        );
      } catch (error: any) {
        if (
          error.code ===
          'auth/user-not-found'
        ) {
          Alert.alert(
            'Error',
            'No account found with this email.'
          );
        } else {
          Alert.alert(
            'Reset Failed',
            error.message
          );
        }
      }
    };

  return (
    <View style={styles.container}>
      {/* LOGO */}
      <Image
        source={require('../assets/images/SmartGuide.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* TITLE */}
      <Text style={styles.title}>
        Sign In
      </Text>

      {/* EMAIL */}
      <TextInput
        placeholder="Email"
        placeholderTextColor="#666"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {/* PASSWORD */}
      <TextInput
        placeholder="Password"
        placeholderTextColor="#666"
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {/* FORGOT PASSWORD */}
      <TouchableOpacity
        onPress={
          handleForgotPassword
        }
      >
        <Text style={styles.forgotText}>
          Forgot Password?
        </Text>
      </TouchableOpacity>

      {/* SIGN IN BUTTON */}
      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
      >
        <Text style={styles.buttonText}>
          Sign In
        </Text>
      </TouchableOpacity>

      {/* GO TO SIGN UP */}
      <TouchableOpacity
        onPress={() =>
          router.push('/signup')
        }
      >
        <Text style={styles.signup}>
          Don't have an account?
          {' '}Sign Up
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eaf1ff',
    justifyContent: 'center',
    padding: 25,
  },

  logo: {
    width: 300,
    height: 200,
    alignSelf: 'center',
    marginBottom: 5,
  },

  title: {
    color: '#0055ff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },

  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowRadius: 4,
    elevation: 2,
  },

  forgotText: {
    color: '#0057FF',
    textAlign: 'left',
    marginBottom: 20,
    fontWeight: '500',
  },

  button: {
    backgroundColor: '#0057FF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',

    shadowColor: '#0057FF',
    shadowOpacity: 0.2,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowRadius: 5,
    elevation: 3,
  },

  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },

  signup: {
    color: '#11449b',
    marginTop: 20,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '500',
  },
});