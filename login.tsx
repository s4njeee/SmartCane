import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebase/firebaseConfig';

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] =
    useState('');
  const [showPassword, setShowPassword] =
    useState(false);

  const emailAnim = useRef(
    new Animated.Value(0)
  ).current;

  const passwordAnim = useRef(
    new Animated.Value(0)
  ).current;

  const animateLabel = (
    anim: Animated.Value,
    isFocused: boolean
  ) => {
    Animated.timing(anim, {
      toValue: isFocused ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  // LOGIN
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
      Alert.alert(
        'Login Failed',
        'Incorrect email or password.'
      );
    }
  };

  // FORGOT PASSWORD
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
          'A reset link has been sent to your email.'
        );
      } catch (error: any) {
        Alert.alert(
          'Reset Failed',
          error.message
        );
      }
    };

  // GOOGLE BUTTON
  const handleGoogleLogin = () => {
    Alert.alert(
      'Google Login',
      'Google login pressed'
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : 'height'
      }
    >
      <TouchableWithoutFeedback
        onPress={Keyboard.dismiss}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={
            false
          }
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
              Sign In
            </Text>

            {/* EMAIL */}
            <View
              style={styles.inputContainer}
            >
              <Animated.Text
                style={[
                  styles.label,
                  {
                    top:
                      emailAnim.interpolate(
                        {
                          inputRange:
                            [0, 1],
                          outputRange:
                            [18, 8],
                        }
                      ),
                    fontSize:
                      emailAnim.interpolate(
                        {
                          inputRange:
                            [0, 1],
                          outputRange:
                            [16, 12],
                        }
                      ),
                    color:
                      emailAnim.interpolate(
                        {
                          inputRange:
                            [0, 1],
                          outputRange:
                            [
                              '#666',
                              '#0057FF',
                            ],
                        }
                      ),
                  },
                ]}
              >
                example@gmail.com
              </Animated.Text>

              <TextInput
                style={styles.inputBox}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() =>
                  animateLabel(
                    emailAnim,
                    true
                  )
                }
                onBlur={() => {
                  if (!email)
                    animateLabel(
                      emailAnim,
                      false
                    );
                }}
              />
            </View>

            {/* PASSWORD */}
            <View
              style={styles.inputContainer}
            >
              <Animated.Text
                style={[
                  styles.label,
                  {
                    top:
                      passwordAnim.interpolate(
                        {
                          inputRange:
                            [0, 1],
                          outputRange:
                            [18, 8],
                        }
                      ),
                    fontSize:
                      passwordAnim.interpolate(
                        {
                          inputRange:
                            [0, 1],
                          outputRange:
                            [16, 12],
                        }
                      ),
                    color:
                      passwordAnim.interpolate(
                        {
                          inputRange:
                            [0, 1],
                          outputRange:
                            [
                              '#666',
                              '#0057FF',
                            ],
                        }
                      ),
                  },
                ]}
              >
                Password
              </Animated.Text>

              <TextInput
                style={styles.inputBox}
                secureTextEntry={
                  !showPassword
                }
                value={password}
                onChangeText={
                  setPassword
                }
                onFocus={() =>
                  animateLabel(
                    passwordAnim,
                    true
                  )
                }
                onBlur={() => {
                  if (!password)
                    animateLabel(
                      passwordAnim,
                      false
                    );
                }}
              />

              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
              >
                <Ionicons
                  name={
                    showPassword
                      ? 'eye'
                      : 'eye-off'
                  }
                  size={24}
                  color="#0057FF"
                />
              </TouchableOpacity>
            </View>

            {/* FORGOT PASSWORD */}
            <TouchableOpacity
              onPress={
                handleForgotPassword
              }
            >
              <Text
                style={
                  styles.forgotText
                }
              >
                Forgot Password?
              </Text>
            </TouchableOpacity>

            {/* SIGN IN */}
            <TouchableOpacity
              style={styles.button}
              onPress={handleLogin}
            >
              <Text
                style={
                  styles.buttonText
                }
              >
                Sign In
              </Text>
            </TouchableOpacity>

            {/* CONTINUE WITH */}
            <View
              style={
                styles.dividerContainer
              }
            >
              <View style={styles.line} />
              <Text style={styles.orText}>
                or continue with
              </Text>
              <View style={styles.line} />
            </View>

            {/* GOOGLE BUTTON */}
            <View
              style={
                styles.socialContainer
              }
            >
              <TouchableOpacity
                style={
                  styles.socialButton
                }
                onPress={
                  handleGoogleLogin
                }
              >
                <Image
                  source={require('../assets/images/google.png')}
                  style={{
                    width: 40,
                    height: 40,
                  }}
                  resizeMode="contain"
                />
                <Text
                  style={
                    styles.socialText
                  }
                >
                  Google
                </Text>
              </TouchableOpacity>
            </View>

            {/* SIGN UP */}
            <TouchableOpacity
              onPress={() =>
                router.push(
                  '/signup'
                )
              }
            >
              <Text
                style={styles.signup}
              >
                Don't have an account?
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        '#eaf1ff',
      justifyContent:
        'center',
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

    inputContainer: {
      backgroundColor:
        '#fff',
      borderRadius: 12,
      marginBottom: 15,
      height: 60,
      justifyContent:
        'center',
      paddingHorizontal: 15,
      elevation: 2,
    },

    label: {
      position: 'absolute',
      left: 15,
    },

    inputBox: {
      fontSize: 16,
      paddingTop: 18,
    },

    eyeIcon: {
      position: 'absolute',
      right: 15,
      top: 18,
    },

    forgotText: {
      color: '#0057FF',
      marginBottom: 20,
      fontWeight: '500',
    },

    button: {
      backgroundColor:
        '#0057FF',
      padding: 16,
      borderRadius: 12,
      alignItems:
        'center',
    },

    buttonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 18,
    },

    dividerContainer: {
      flexDirection: 'row',
      alignItems:
        'center',
      marginTop: 25,
      marginBottom: 20,
    },

    line: {
      flex: 1,
      height: 1,
      backgroundColor:
        '#ddd',
    },

    orText: {
      marginHorizontal: 10,
      color: '#888',
      fontSize: 14,
    },

    socialContainer: {
      justifyContent:
        'center',
      alignItems:
        'center',
      marginBottom: 10,
    },

    socialButton: {
      flexDirection: 'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        '#fff',
      paddingVertical: 7,
      width: '100%',
      borderRadius: 12,
      elevation: 2,
    },

    socialText: {
      marginLeft: 8,
      fontWeight: 'bold',
      color: '#333',
      fontSize: 17,
    },

    signup: {
      color: '#343434',
      marginTop: 20,
      textAlign: 'center',
      fontSize: 15,
    },
  });