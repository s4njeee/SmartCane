# 🦯 SmartCane

SmartCane is a capstone project that aims to enhance the safety, mobility, and independence of visually impaired individuals through a smart assistive walking cane integrated with a mobile application. The system utilizes obstacle detection, GPS tracking, voice alerts, and emergency communication to provide real-time assistance and improve navigation.

## Project Purpose

The purpose of SmartCane is to develop an affordable and intelligent assistive solution that helps visually impaired users navigate their surroundings safely while allowing guardians to monitor their location during emergencies.

## Features

- 🔊 Real-time voice alerts for obstacle detection
- 📍 GPS location tracking
- 🚨 Emergency SOS button
- 👨‍👩‍👧 Guardian monitoring
- 🔔 Push notifications
- ☁️ Cloud-based data synchronization using Supabase
- 🔐 Secure user authentication
- 📱 User-friendly mobile application

## Built With

- React Native
- Expo
- Expo Router
- TypeScript
- Supabase
- ESP32
- Ultrasonic Sensor
- GPS Module

## Installation

### Clone the repository

```bash
git clone https://github.com/your-username/SmartCane.git
cd SmartCane
```

### Install dependencies

```bash
npm install
```

### Configure environment variables

Create a `.env` file in the project root.

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Start the application

```bash
npx expo start
```

Run the application using:

- Expo Go
- Android Emulator
- Physical Android Device

## Project Structure

```
SmartCane/
├── app/
├── assets/
├── components/
├── hooks/
├── services/
├── utils/
├── constants/
├── types/
└── README.md
```

## Usage

1. Launch the SmartCane mobile application.
2. Sign in or create an account.
3. Pair the SmartCane device with the application.
4. Receive voice alerts when obstacles are detected.
5. Monitor the user's live location through GPS.
6. Use the SOS feature during emergencies to notify guardians.

## Future Improvements

- AI-powered obstacle classification
- Offline navigation support
- Battery health monitoring
- Voice command integration
- Fall detection

## Developers

This project was developed as a Capstone Project by students taking the Bachelor of Industrial Technology program.

## License

This project is intended for academic purposes only.