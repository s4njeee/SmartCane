import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ScrollView, } from 'react-native'
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';
import { getAuth } from "firebase/auth";

export default function SignupScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] =
    useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] =
    useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');

  const handleSignup = async () => {
    // CHECK EMPTY FIELDS
    if (
      !fullName ||
      !phoneNumber ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert(
        'Error',
        'Please fill in all fields.'
      );
      return;
    }

    // PHONE VALIDATION
    if (phoneNumber.length < 10) {
      Alert.alert(
        'Error',
        'Please enter a valid phone number.'
      );
      return;
    }

    // PASSWORD MATCH CHECK
    if (password !== confirmPassword) {
      Alert.alert(
        'Error',
        'Passwords do not match.'
      );
      return;
    }

    // PASSWORD LENGTH
    if (password.length < 6) {
      Alert.alert(
        'Error',
        'Password must be at least 6 characters.'
      );
      return;
    }

    try {
      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

      Alert.alert(
        'Success',
        `Welcome ${fullName}! Your account has been created.`
      );

      console.log(
        'User:',
        userCredential.user
      );

      // GO TO HOME
      router.replace('../home');
    } catch (error: any) {
      Alert.alert(
        'Signup Failed',
        error.message
      );
    }
  };

  return (
    <ScrollView
      contentContainerStyle={
        styles.scrollContainer
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        {/* LOGO */}
        <Image
          source={require('../assets/images/SmartGuide.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* TITLE */}
        <Text style={styles.title}>
          Create Account
        </Text>

        {/* FULL NAME */}
        <TextInput
          placeholder="Full Name"
          placeholderTextColor="#666"
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
        />

        {/* PHONE NUMBER */}
        <TextInput
          placeholder="Phone Number"
          placeholderTextColor="#666"
          style={styles.input}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
        />

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
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* CONFIRM PASSWORD */}
        <TextInput
          placeholder="Confirm Password"
          placeholderTextColor="#666"
          style={styles.input}
          value={confirmPassword}
          onChangeText={
            setConfirmPassword
          }
          secureTextEntry
        />

        {/* SIGN UP BUTTON */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleSignup}
        >
          <Text style={styles.buttonText}>
            Sign Up
          </Text>
        </TouchableOpacity>

        {/* BACK TO SIGN IN */}
        <TouchableOpacity
          style={styles.signInButton}
          onPress={() =>router.replace('../login')
          }
        >
          <Text style={styles.signInText}>
            Already have an account?
            {'  '}Sign In
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },

  container: {
    flex: 1,
    backgroundColor: '#eaf1ff',
    justifyContent: 'center',
    padding: 25,
    minHeight: '100%',
  },

  logo: {
    width: 300,
    height: 180,
    alignSelf: 'center',
    marginBottom: -10,
  },

  title: {
    color: '#0057FF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },

  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    fontSize: 15,

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowRadius: 4,
    elevation: 2,
  },

  button: {
    backgroundColor: '#0057FF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,

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
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  signInButton: {
    marginTop: 20,
    alignItems: 'center',
    marginBottom: 20,
  },

  signInText: {
    color: '#0057FF',
    fontSize: 14,
    fontWeight: 'normal',
  },
});