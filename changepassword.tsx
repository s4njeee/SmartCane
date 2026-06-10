import React, {
  useState,
} from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';

import { useRouter } from 'expo-router';
import {
  updatePassword,
} from 'firebase/auth';

import { auth } from '../firebase/firebaseConfig';

export default function ChangePassword() {
  const router = useRouter();

  const [newPassword,
    setNewPassword] =
    useState('');

  const handleChangePassword =
    async () => {
      const user =
        auth.currentUser;

      if (!user) {
        Alert.alert(
          'Error',
          'No user logged in.'
        );
        return;
      }

      if (
        newPassword.length <
        6
      ) {
        Alert.alert(
          'Error',
          'Password must be at least 6 characters.'
        );
        return;
      }

      try {
        await updatePassword(
          user,
          newPassword
        );

        Alert.alert(
          'Success',
          'Password updated successfully!'
        );

        router.back();
      } catch (
        error: any
      ) {
        Alert.alert(
          'Error',
          error.message
        );
      }
    };

  return (
    <View
      style={
        styles.container
      }
    >
      <View
        style={
          styles.headerRow
        }
      >
        <TouchableOpacity
          style={
            styles.backBtn
          }
          onPress={() =>
            router.back()
          }
        >
          <Text
            style={
              styles.backText
            }
          >
            ←
          </Text>
        </TouchableOpacity>

        <Text
          style={
            styles.title
          }
        >
          Change Password
        </Text>
      </View>

      <TextInput
        style={
          styles.input
        }
        placeholder="New Password"
        secureTextEntry
        value={
          newPassword
        }
        onChangeText={
          setNewPassword
        }
      />

      <TouchableOpacity
        style={
          styles.button
        }
        onPress={
          handleChangePassword
        }
      >
        <Text
          style={
            styles.buttonText
          }
        >
          Update Password
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor:
        '#eaf1ff',
    },

    headerRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      marginBottom: 30,
      marginTop: 20,
    },

    backBtn: {
      width: 35,
      height: 35,
      borderRadius: 18,
      backgroundColor:
        '#fff',
      justifyContent:
        'center',
      alignItems:
        'center',
      marginRight: 10,
    },

    backText: {
      fontSize: 20,
      color: '#0057FF',
    },

    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: '#0057FF',
    },

    input: {
      backgroundColor:
        '#fff',
      borderRadius: 12,
      padding: 15,
      marginBottom: 20,
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
      fontWeight:
        'bold',
      fontSize: 16,
    },
  });