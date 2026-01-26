# 🤖 Saraiva.AI

<div align="center">

**WhatsApp-style AI chat app with stunning animations and intelligent response suggestions**

[![React Native](https://img.shields.io/badge/React_Native-0.81.5-61DAFB?logo=react)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-~54.0-000020?logo=expo)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[Features](#-features) • [Installation](#-installation) • [Architecture](#-architecture) • [Animations](#-animations) • [Demo](#-demo)

</div>

---

## ✨ Features

### 🎨 **Premium UI/UX**
- **Glassmorphism** effects with blur and transparency
- **Smooth animations** at 60fps using React Native Animated API
- **Interactive components** with ripple effects and haptic feedback
- **Dynamic gradients** that respond to data (confidence levels, emotions)

### 🤖 **AI-Powered Conversations**
- **Smart response suggestions** with psychological archetypes (Empathetic, Assertive, Curious, Strategic)
- **Confidence indicators** with animated progress bars
- **Emotion detection** from incoming messages
- **Typing animation** for realistic message previews

### 🎯 **Agent Automation**
- **AI agents** that can respond automatically to conversations
- **Mission-based** goal tracking for agents
- **Hybrid mode** (manual + automatic responses)
- **Profile analysis** to understand contact personalities

### 💬 **Real-time Messaging**
- **WebSocket** connections for instant updates
- **Offline-first** architecture with local caching
- **Message synchronization** with backend
- **Read receipts** and timestamps

### 🎊 **Delightful Interactions**
- **Confetti celebration** when sending messages successfully
- **Ripple effects** on card selections
- **Pulsing glow** for active selections
- **Haptic feedback** on interactions
- **Smooth transitions** between states

---

## 📱 Demo

### Glassmorphism Card with Animated Archetypes
The AI suggestion card appears with a smooth slide-up animation, featuring glassmorphism effect and dynamic confidence bars.

### Interactive Archetype Selection
Each archetype card responds to touch with ripple effects, scale animations, and pulsing glows when selected.

### Typing Animation Preview
Messages appear character-by-character with a blinking cursor, creating a realistic typing experience.

### Confetti Celebration
When you successfully send messages, colorful confetti particles animate across the screen with realistic physics.

---

## 🚀 Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo Go app (for testing on device)
- iOS Simulator or Android Emulator (optional)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/saraivabr/saraiva-ai-app.git
cd saraiva-ai-app

# Install dependencies
npm install

# Start the development server
npm start

# Run on specific platform
npm run android  # Android
npm run ios      # iOS
npm run web      # Web
```

### Building APK

#### Option 1: EAS Build (Recommended)
```bash
# Login to Expo
npx eas-cli login

# Configure the project
npx eas-cli build:configure

# Build APK
npx eas-cli build --platform android --profile preview
```

#### Option 2: Local Build
```bash
# Install JDK 17
brew install openjdk@17

# Set JAVA_HOME
export JAVA_HOME=/opt/homebrew/opt/openjdk@17

# Prebuild Android project
npx expo prebuild --platform android

# Build APK
cd android && ./gradlew assembleRelease
```

APK location: `android/app/build/outputs/apk/release/`

---

## 🏗️ Architecture

### Project Structure

```
saraiva-ai-app/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── GlassCard.tsx              # Glassmorphism card with animations
│   │   ├── AnimatedConfidenceBar.tsx  # Dynamic gradient progress bar
│   │   ├── InteractiveArchetypeCard.tsx # Archetype selection with effects
│   │   ├── TypingMessage.tsx          # Typing animation component
│   │   ├── Confetti.tsx              # Celebration particles
│   │   ├── AgenteBadge.tsx           # Agent status indicator
│   │   └── ...
│   ├── screens/            # App screens
│   │   ├── ConversasScreen.tsx       # Chat list
│   │   ├── ChatScreen.tsx            # Individual chat
│   │   ├── IAScreen.tsx              # AI assistant
│   │   ├── MissoesScreen.tsx         # Missions management
│   │   └── PerfilScreen.tsx          # User profile
│   ├── services/           # API and business logic
│   │   ├── api.ts                    # Backend API client
│   │   └── cache.ts                  # Local storage management
│   ├── hooks/              # Custom React hooks
│   │   ├── useWebSocket.tsx          # WebSocket connection
│   │   └── useConnectivity.tsx       # Network status
│   └── theme/              # Design tokens
│       └── whatsapp.ts              # Color palette & spacing
├── assets/                 # Images and icons
├── App.tsx                 # Root component
└── package.json
```

### Tech Stack

**Frontend:**
- React Native 0.81.5
- Expo ~54.0
- TypeScript 5.9.2
- React Navigation 7.x
- Axios (HTTP client)

**Animations:**
- React Native Animated API
- expo-blur (glassmorphism)
- expo-haptics (tactile feedback)

**State Management:**
- React Hooks (useState, useCallback, useRef)
- Custom hooks for WebSocket and connectivity

**Storage:**
- AsyncStorage (local caching)
- WebSocket (real-time updates)

---

## 🎬 Animations

### Component Animations

#### 1. **GlassCard** (Entrance Animation)
```typescript
- Slide up: translateY(50px → 0) in 500ms
- Fade in: opacity(0 → 1) in 500ms
- Scale: scale(0.95 → 1) with spring (friction: 8)
```

#### 2. **AnimatedConfidenceBar** (Progress Fill)
```typescript
- Width animation: spring effect (friction: 8)
- Dynamic gradient: red → yellow → green based on value
- Shimmer effect: pulsing glow loop (2s)
```

#### 3. **InteractiveArchetypeCard** (Interactions)
```typescript
- Press: scale(1 → 0.95) with spring
- Ripple: scale(0 → 3) + opacity(0.5 → 0) in 600ms
- Selection glow: pulsing loop (1.5s)
```

#### 4. **TypingMessage** (Text Reveal)
```typescript
- Character-by-character: 30ms per char
- Cursor blink: 500ms interval
- Entrance: slide up + fade (300ms)
```

#### 5. **Confetti** (Celebration)
```typescript
- 20 particles with random colors
- Fall animation: 2-4 seconds with physics
- Rotation: random -180° to 180°
```

### Performance
- All animations use `useNativeDriver: true` for 60fps
- Spring animations with `friction: 8` for natural motion
- Blur effects optimized with `expo-blur` (intensity: 20-25)

---

## 🎨 Design System

### Color Palette

```typescript
// Primary Colors
primary: '#075E54'      // WhatsApp Green
secondary: '#25D366'    // Success Green
iaAccent: '#8a2be2'     // AI Purple
iaAccentLight: 'rgba(138, 43, 226, 0.15)'

// Background
background: '#FFFFFF'
chatBackground: '#ECE5DD'

// Text
textPrimary: '#000000'
textSecondary: '#667781'
textLight: '#FFFFFF'

// Confidence Levels
success: '#4CAF50'      // 70-100%
warning: '#FFC107'      // 40-70%
error: '#FF5722'        // 0-40%
```

### Spacing Scale
```typescript
xs: 4px
sm: 8px
md: 12px
lg: 16px
xl: 24px
```

---

## 📦 Dependencies

### Core
```json
{
  "expo": "~54.0.32",
  "react": "19.1.0",
  "react-native": "0.81.5",
  "typescript": "~5.9.2"
}
```

### Navigation
```json
{
  "@react-navigation/bottom-tabs": "^7.10.1",
  "@react-navigation/native": "^7.1.28",
  "@react-navigation/native-stack": "^7.10.1"
}
```

### Features
```json
{
  "axios": "^1.13.2",
  "expo-blur": "~15.0.8",
  "expo-haptics": "~15.0.8",
  "@react-native-async-storage/async-storage": "^1.24.0",
  "@react-native-community/netinfo": "^11.3.1"
}
```

---

## 🔧 Configuration

### Backend API
Update the base URL in `src/services/api.ts`:
```typescript
const api = axios.create({
  baseURL: 'YOUR_BACKEND_URL/api'
});
```

### Environment Variables
No `.env` file needed for frontend. All configuration is in code.

---

## 🧪 Testing

Currently, no automated tests are configured. When adding tests:

```bash
# Frontend tests with Jest
npm test

# Type checking
npx tsc --noEmit
```

---

## 📈 Roadmap

- [ ] **Skeleton loading** animations
- [ ] **Dark mode** support
- [ ] **Voice messages** with waveform visualization
- [ ] **Image preview** with zoom gestures
- [ ] **Search** functionality in conversations
- [ ] **Push notifications** for new messages
- [ ] **Automated tests** (Jest + React Native Testing Library)

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Inspired by [WhatsApp](https://www.whatsapp.com/) design
- UI components inspired by [react-native-gifted-chat](https://github.com/FaridSafi/react-native-gifted-chat)
- Animation patterns from [kabhinav577/react-native-whatsapp](https://github.com/kabhinav577/react-native-whatsapp)
- Glassmorphism effects using [expo-blur](https://docs.expo.dev/versions/latest/sdk/blur-view/)

---

## 📞 Contact

**Saraiva** - [@saraivabr](https://github.com/saraivabr)

Project Link: [https://github.com/saraivabr/saraiva-ai-app](https://github.com/saraivabr/saraiva-ai-app)

---

<div align="center">

**Made with ❤️ and ✨ animations**

⭐ Star this repo if you like it!

</div>
