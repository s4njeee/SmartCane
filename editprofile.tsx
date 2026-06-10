import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';

import { useRouter } from 'expo-router';
import { auth, db } from '../firebase/firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  updateProfile,
  updateEmail,
} from 'firebase/auth';

export default function SettingsScreen() {
  const router = useRouter();
  const user = auth.currentUser;

  const [fullName, setFullName] =
    useState(
      user?.displayName || ''
    );

  const [email, setEmail] =
    useState(
      user?.email || ''
    );

  const [phoneNumber,
    setPhoneNumber] =
    useState('');

  const [gender,
    setGender] =
    useState('Male');

  const [age,
    setAge] =
    useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData =
    async () => {
      if (!user)
        return;

      try {
        const snap =
          await getDoc(
            doc(
              db,
              'users',
              user.uid
            )
          );

        if (
          snap.exists()
        ) {
          const data =
            snap.data();

          setFullName(
            data.displayName ||
              ''
          );

          setEmail(
            data.email ||
              ''
          );

          setPhoneNumber(
            data.phoneNumber ||
              ''
          );

          setGender(
            data.gender ||
              'Male'
          );

          setAge(
            data.age ||
              ''
          );
        }
      } catch (
        error
      ) {
        console.log(
          error
        );
      }
    };

  const handleSave =
    async () => {
      if (!user)
        return;

      try {
        await updateProfile(
          user,
          {
            displayName:
              fullName,
          }
        );

        if (
          email !==
          user.email
        ) {
          await updateEmail(
            user,
            email
          );
        }

        await setDoc(
          doc(
            db,
            'users',
            user.uid
          ),
          {
            displayName:
              fullName,
            email:
              email,
            phoneNumber:
              phoneNumber,
            gender:
              gender,
            age: age,
          },
          {
            merge: true,
          }
        );

        Alert.alert(
          'Success',
          'Profile updated successfully!'
        );

        router.replace(
          '/profile'
        );
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
    <ScrollView
      style={
        styles.container
      }
      showsVerticalScrollIndicator={
        false
      }
    >
      {/* HEADER */}
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
            router.replace(
              '/profile'
            )
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
          Edit Profile
        </Text>
      </View>

      {/* FORM */}
      <View
        style={
          styles.card
        }
      >
        <Text
          style={
            styles.label
          }
        >
          Full Name
        </Text>

        <TextInput
          style={
            styles.input
          }
          placeholder="Enter full name"
          value={
            fullName
          }
          onChangeText={
            setFullName
          }
        />

        <Text
          style={
            styles.label
          }
        >
          Email
        </Text>

        <TextInput
          style={
            styles.input
          }
          placeholder="Enter email"
          value={email}
          keyboardType="email-address"
          onChangeText={
            setEmail
          }
        />

        <Text
          style={
            styles.label
          }
        >
          Phone Number
        </Text>

        <TextInput
          style={
            styles.input
          }
          placeholder="Enter phone number"
          keyboardType="phone-pad"
          value={
            phoneNumber
          }
          onChangeText={
            setPhoneNumber
          }
        />

        <Text
          style={
            styles.label
          }
        >
          Age
        </Text>

        <TextInput
          style={
            styles.input
          }
          placeholder="Enter age"
          keyboardType="numeric"
          value={age}
          onChangeText={
            setAge
          }
        />

        {/* GENDER */}
        <Text
          style={
            styles.label
          }
        >
          Gender
        </Text>

        <View
          style={
            styles.genderContainer
          }
        >
          {[
            'Male',
            'Female',
            'Other',
          ].map(
            (
              item
            ) => (
              <TouchableOpacity
                key={
                  item
                }
                style={[
                  styles.genderBtn,
                  gender ===
                    item &&
                    styles.genderActive,
                ]}
                onPress={() =>
                  setGender(
                    item
                  )
                }
              >
                <Text
                  style={[
                    styles.genderText,
                    gender ===
                      item && {
                        color:
                          '#fff',
                      },
                  ]}
                >
                  {
                    item
                  }
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>

      {/* SAVE */}
      <TouchableOpacity
        style={
          styles.saveBtn
        }
        onPress={
          handleSave
        }
      >
        <Text
          style={
            styles.saveText
          }
        >
          Save Changes
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        '#F8FAFC',
      padding: 20,
    },

    headerRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      marginTop: 50,
      marginBottom: 25,
    },

    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor:
        '#fff',
      justifyContent:
        'center',
      alignItems:
        'center',
      marginRight: 12,
      elevation: 3,
    },

    backText: {
      fontSize: 22,
      color: '#0057FF',
      fontWeight:
        '700',
    },

    title: {
      fontSize: 28,
      fontWeight:
        '700',
      color: '#0057FF',
    },

    card: {
      backgroundColor:
        '#fff',
      borderRadius: 24,
      padding: 20,
      elevation: 2,
    },

    label: {
      fontSize: 15,
      fontWeight:
        '600',
      marginBottom: 8,
      color: '#111827',
    },

    input: {
      backgroundColor:
        '#F3F4F6',
      borderRadius: 14,
      padding: 15,
      marginBottom: 18,
      fontSize: 16,
    },

    genderContainer:
      {
        flexDirection:
          'row',
        justifyContent:
          'space-between',
        marginBottom: 20,
      },

    genderBtn: {
      flex: 1,
      backgroundColor:
        '#F3F4F6',
      padding: 15,
      borderRadius: 14,
      marginHorizontal: 5,
      alignItems:
        'center',
    },

    genderActive: {
      backgroundColor:
        '#0057FF',
    },

    genderText: {
      fontSize: 16,
      fontWeight:
        '600',
    },

    saveBtn: {
      backgroundColor:
        '#0057FF',
      padding: 18,
      borderRadius: 18,
      alignItems:
        'center',
      marginTop: 25,
      marginBottom: 40,
    },

    saveText: {
      color: '#fff',
      fontWeight:
        '700',
      fontSize: 17,
    },
  });