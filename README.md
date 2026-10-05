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

## Dev UI Inspector

Dev-only overlay that shows the source file and styles for any tapped element. It is stripped from production builds (`__DEV__` gate + Babel/Metro no-ops).

1. Restart Metro with a clean cache after pulling inspector changes. Prefer `npm start` (sets `REACT_EDITOR=cursor` automatically), or:
   `$env:REACT_EDITOR='cursor'; npx expo start --go -c`
   Cursor’s **Install 'cursor' command in PATH** must already be enabled.
2. Open the app in **Expo Go**, shake the device, or press **`m`** in the Metro terminal (on an Android emulator, Ctrl+M). Or tap the small **Insp** chip (top-right, dev only).
3. Choose **Toggle UI Inspector** (or tap **Insp**).
4. Tap any UI element — the tap is captured (buttons do not fire). A panel shows `file:line`, style summary, colors, props/hooks, and breadcrumbs.
5. Use **Open in editor**, tap a breadcrumb to inspect an ancestor, **Minimize** / restore the pill, or **Close** / toggle off.

## Future Improvements

- Offline navigation support
- Battery health monitoring
- Voice command integration
- Fall detection

## Developers

This project was developed as a Capstone Project by students taking the Bachelor of Industrial Technology program.

## License

This project is intended for academic purposes only.