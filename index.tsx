import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';

import { useRouter } from 'expo-router';

export default function ChooseScreen() {
  const router = useRouter();

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
        Welcome to SmartGuide
      </Text>

      <Text style={styles.subtitle}>
        Choose an option to continue
      </Text>

      {/* SIGN IN BUTTON */}
      <TouchableOpacity
        style={styles.signInButton}
        onPress={() =>
          router.push('../login')
        }
      >
        <Text style={styles.buttonText}>
          Sign In
        </Text>
      </TouchableOpacity>

      {/* SIGN UP BUTTON */}
      <TouchableOpacity
        style={styles.signUpButton}
        onPress={() =>
          router.push('../signup')
        }
      >
        <Text style={styles.signUpText}>
          Sign Up
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
    alignItems: 'center',
    padding: 25,
  },

  logo: {
    width: 300,
    height: 200,
    marginBottom: -10,
  },

  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#0057FF',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 50,
  },

  signInButton: {
    width: '100%',
    backgroundColor: '#0057FF',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 15,
  },

  signUpButton: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0057FF',
  },

  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  signUpText: {
    color: '#0057FF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});