# Saraiva.AI

App mobile estilo WhatsApp com IA integrada.

## Testar no celular (Expo Go)

1. Instale o app **Expo Go** no seu celular (Android/iOS)
2. No terminal, execute:
   ```bash
   cd /Users/saraiva/Downloads/esc/saraiva-ai-app
   npx expo start
   ```
3. Escaneie o QR code com o Expo Go

## Gerar APK

### Opção 1: EAS Build (Recomendado)

1. Crie uma conta em [expo.dev](https://expo.dev)
2. Faça login:
   ```bash
   npx eas-cli login
   ```
3. Configure o projeto:
   ```bash
   npx eas-cli build:configure
   ```
4. Gere o APK:
   ```bash
   npx eas-cli build --platform android --profile preview
   ```

### Opção 2: Build Local (requer Java)

1. Instale o JDK 17:
   ```bash
   brew install openjdk@17
   ```
2. Configure JAVA_HOME:
   ```bash
   export JAVA_HOME=/opt/homebrew/opt/openjdk@17
   ```
3. Gere o Android project:
   ```bash
   npx expo prebuild --platform android
   ```
4. Build APK:
   ```bash
   cd android && ./gradlew assembleRelease
   ```
5. APK estará em: `android/app/build/outputs/apk/release/`

## Estrutura

```
saraiva-ai-app/
├── App.tsx                 # Navegação principal
├── src/
│   ├── screens/
│   │   ├── ConversasScreen.tsx  # Lista de conversas
│   │   ├── ChatScreen.tsx       # Tela de chat
│   │   └── IAScreen.tsx         # Assistente IA
│   ├── services/
│   │   └── api.ts               # Conexão com backend
│   └── theme/
│       └── whatsapp.ts          # Cores WhatsApp
└── eas.json                     # Config EAS Build
```

## Backend

API: https://ultron-v2.osc-fr1.scalingo.io

Endpoints usados:
- GET /api/conversas
- GET /api/conversas/{jid}/mensagens
- POST /api/conversas/{jid}/enviar
- POST /api/conversas/{jid}/sugerir
- POST /api/ia/chat
