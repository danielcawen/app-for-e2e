# Android Mobile App Build Plan

Source app: `/Users/daniel/Documents/app-for-e2e`
Target: React Native Android app mirroring the existing web app features.

## App Features to Port

From the existing web app:
- **Auth**: Email/password signup, login, magic-link (email verify flow)
- **Chat**: Create conversations, send/receive AI messages, delete messages
- **Screens**: Login, Magic-link verify, Chat
- **Backend**: Reuse the existing Express API (unchanged) — mobile app is a new client only

---

## Stack Decision

| Layer | Choice | Reason |
|---|---|---|
| Framework | React Native (bare workflow) | TypeScript already in use; team familiar with React |
| Navigation | React Navigation v6 | Standard; mirrors React Router structure |
| HTTP client | Axios | Already used in web frontend |
| Styling | NativeWind (Tailwind for RN) | Same utility-class mental model as existing Tailwind |
| State | React hooks only (no Redux) | Matches existing web app simplicity |
| Build | Android Studio + Gradle | Required for APK/AAB output |

---

## Prerequisites (do once)

- [ ] Node.js 18+ installed
- [ ] Java 17 (JDK) installed (`JAVA_HOME` set)
- [ ] Android Studio installed with SDK Platform 34 and build-tools 34
- [ ] `ANDROID_HOME` environment variable set
- [ ] Physical device or AVD (emulator) configured
- [ ] Existing backend running (Docker or local) and reachable from device/emulator

---

## Phase 1 — Project Scaffold

### Step 1.1 — Init React Native project

```bash
npx @react-native-community/cli@latest init E2ePracticeApp \
  --template react-native-template-typescript
```

Creates: `E2ePracticeApp/` with Android and iOS folders.

Verify: `cd E2ePracticeApp && npx react-native run-android` shows default splash on device/emulator.

---

### Step 1.2 — Add to monorepo

Move `E2ePracticeApp/` into the repo root:

```
app-for-e2e/
  backend/
  frontend/
  mobile/          ← rename E2ePracticeApp to mobile
  docker-compose.yml
```

Update root `package-lock.json` (workspaces are not shared — mobile is standalone npm).

Verify: `cd mobile && npm install && npx react-native run-android` still works.

---

### Step 1.3 — Install dependencies

```bash
cd mobile
npm install axios react-navigation/native react-navigation/native-stack \
  react-native-screens react-native-safe-area-context nativewind
npm install -D tailwindcss
npx tailwindcss init
```

Configure NativeWind per its docs (babel plugin + tailwind.config.js content glob).

Verify: A test component with `className="text-red-500"` renders red text on device.

---

## Phase 2 — Project Structure

### Step 2.1 — Create folder layout

Mirror the web frontend layout:

```
mobile/src/
  components/
  hooks/
  pages/
  services/
  types/
```

### Step 2.2 — Copy and adapt types

Copy `frontend/src/types/index.ts` → `mobile/src/types/index.ts` verbatim.
No changes needed — types are pure TypeScript interfaces.

### Step 2.3 — Create API service base

Create `mobile/src/services/api.ts`:

```ts
import axios from 'axios';

// Use 10.0.2.2 for Android emulator (maps to host localhost)
// Use your LAN IP (e.g. 192.168.x.x) for a physical device
const BASE_URL = 'http://10.0.2.2:3001/api';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = /* read from AsyncStorage */ null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
```

Note: install `@react-native-async-storage/async-storage` for token persistence.

```bash
npm install @react-native-async-storage/async-storage
```

Verify: `api.get('/')` returns `{ status: 'UP' }` from a test component.

---

## Phase 3 — Auth Flow

### Step 3.1 — Auth service

Create `mobile/src/services/authService.ts` mirroring `frontend/src/services/authService.ts`:

Endpoints to wrap:
- `POST /api/auth/signup` → `signup(email, password, firstName?, lastName?)`
- `POST /api/auth/login` → `login(email, password)` → returns `{ user, token }`
- `POST /api/auth/send-magic-link` → `sendMagicLink(email)`
- `GET /api/auth/me` → `getMe()` (uses Bearer token)

Token storage: save JWT to `AsyncStorage` after login/signup, clear on logout.

Verify: Call `login()` from a test screen and log the returned token.

---

### Step 3.2 — useAuth hook

Create `mobile/src/hooks/useAuth.ts` with state: `{ user, token, loading }` and actions: `login`, `signup`, `sendMagicLink`, `logout`.

Mirrors `frontend/src/hooks/useAuth.ts` logic.

On app start, read token from `AsyncStorage` and call `getMe()` to restore session.

Verify: After login, killing and reopening the app restores the user session.

---

### Step 3.3 — LoginScreen

Create `mobile/src/pages/LoginPage.tsx`:

Two modes (tabs or toggle):
1. **Email + Password** — fields for email, password, submit calls `login()`
2. **Magic Link** — field for email, submit calls `sendMagicLink()`, show "Check your email" confirmation

Use NativeWind classes. Match the visual structure of `frontend/src/components/LoginForm.tsx`.

Verify: Login with a seeded user (`npm run seed` in backend) succeeds and navigates to Chat.

---

### Step 3.4 — VerifyScreen (magic link)

Magic links open a URL like `http://localhost:3001/api/auth/verify?token=...`.

On mobile, the app must register a deep link scheme to intercept these.

Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="e2epractice" android:host="auth" />
</intent-filter>
```

Update email service (`backend/src/services/emailService.ts`) to send:
```
e2epractice://auth/verify?token=TOKEN
```
alongside (or instead of) the HTTP link when `APP_ENV=mobile`.

Create `mobile/src/pages/VerifyPage.tsx`:
- On mount, extract `token` from deep link URL
- Call `GET /api/auth/verify?token=TOKEN`
- On success, save JWT and navigate to Chat

Install `react-native-linking` (built-in) — no extra package needed.

Verify: Tap magic link email on device → app opens VerifyScreen → lands on Chat.

---

## Phase 4 — Chat Flow

### Step 4.1 — Chat service

Create `mobile/src/services/chatService.ts` mirroring `frontend/src/services/chatService.ts`:

Endpoints to wrap:
- `POST /api/chat/conversations` → `createConversation()`
- `POST /api/chat/messages` → `sendMessage(conversationId, content)`
- `GET /api/chat/messages/:conversationId` → `getMessages(conversationId)`
- `DELETE /api/chat/messages/:messageId` → `deleteMessage(messageId)`

Verify: Call `createConversation()` and log the returned conversation ID.

---

### Step 4.2 — useChat hook

Create `mobile/src/hooks/useChat.ts` mirroring `frontend/src/hooks/useChat.ts`:

State: `{ messages, conversation, loading, error }`
Actions: `sendMessage(content)`, `deleteMessage(id)`, `loadMessages()`

On mount: create a new conversation (or load latest), then `loadMessages()`.

Verify: `sendMessage("hello")` appends a user message and an AI response to state.

---

### Step 4.3 — ChatMessage component

Create `mobile/src/components/ChatMessage.tsx`:

Props: `message: Message`

Render user messages right-aligned, AI messages left-aligned.
Long-press to trigger delete (call `deleteMessage`).

Verify: Messages display correctly with distinct visual treatment for user vs AI.

---

### Step 4.4 — ChatInterface component

Create `mobile/src/components/ChatInterface.tsx`:

- `FlatList` of `ChatMessage` components (auto-scroll to bottom on new message)
- Text input + Send button at bottom (pinned above keyboard)
- Loading indicator while AI is responding
- Header: user email + Logout button

Use `KeyboardAvoidingView` on Android to keep input visible.

Verify: Full chat loop — type message, send, AI responds, messages scroll correctly.

---

### Step 4.5 — ChatScreen

Create `mobile/src/pages/ChatPage.tsx`:

Compose `ChatInterface` with `useChat` hook. Guard: if no auth token, redirect to Login.

Verify: Unauthenticated navigation to `/chat` redirects to Login.

---

## Phase 5 — Navigation

### Step 5.1 — Navigator setup

Create `mobile/src/App.tsx`:

```tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <SplashScreen />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Chat" component={ChatPage} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginPage} />
            <Stack.Screen name="Verify" component={VerifyPage} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

Verify: Navigating between Login → Verify → Chat works without stale screens.

---

## Phase 6 — Android Build Config

### Step 6.1 — App name and package

Edit `mobile/android/app/src/main/res/values/strings.xml`:
```xml
<string name="app_name">E2E Practice</string>
```

Edit `mobile/android/app/build.gradle`:
```gradle
applicationId "com.e2epractice"
```

---

### Step 6.2 — App icon

Replace default icons in `mobile/android/app/src/main/res/mipmap-*/` with your icon assets.
Use Android Studio → Image Asset Studio for easiest generation.

---

### Step 6.3 — Network security (cleartext for dev)

Create `mobile/android/app/src/main/res/xml/network_security_config.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">10.0.2.2</domain>
    <domain includeSubdomains="true">192.168.0.0</domain>
  </network-security-config>
</network-security-config>
```

Reference in `AndroidManifest.xml`:
```xml
android:networkSecurityConfig="@xml/network_security_config"
```

Verify: API calls succeed on device (no cleartext blocked errors in Logcat).

---

### Step 6.4 — Debug APK

```bash
cd mobile/android
./gradlew assembleDebug
```

Output: `mobile/android/app/build/outputs/apk/debug/app-debug.apk`

Install: `adb install app-debug.apk`

Verify: APK installs and full flow (login → chat) works on physical device.

---

## Phase 7 — Testing Plan

### Step 7.1 — Unit tests (Jest + React Native Testing Library)

```bash
npm install -D @testing-library/react-native
```

Test targets:
- `useAuth` hook: login, logout, session restore
- `useChat` hook: send message, delete message
- `LoginPage`: renders both modes, calls correct service methods

---

### Step 7.2 — E2E tests (Detox)

```bash
npm install -D detox @types/detox
```

Test scenarios mirroring the web E2E suite:
1. Sign up with new email
2. Log in with email + password
3. Send a chat message and receive AI response
4. Delete a chat message
5. Send magic link and verify via deep link

---

## Phase 8 — Backend Adjustments (minimal)

The backend is reused as-is. Two small additions needed:

### Step 8.1 — CORS for mobile

Mobile apps do not send an `Origin` header. The existing `cors()` config (open) already works. No change needed.

### Step 8.2 — Magic link deep link URL (optional)

If deep links are used (Step 3.4), add env var `MOBILE_DEEP_LINK_BASE=e2epractice://auth` and update `emailService.ts` to include a mobile-friendly link in the email alongside the web link.

---

## Delivery Checklist

- [ ] Phase 1: Project scaffold — RN project in `mobile/`, runs on emulator
- [ ] Phase 2: Structure + types + API base configured
- [ ] Phase 3: Auth flow — login, signup, magic link, session restore
- [ ] Phase 4: Chat flow — conversations, messages, delete
- [ ] Phase 5: Navigation — auth guard, screen transitions
- [ ] Phase 6: Android build — named app, icon, debug APK produced
- [ ] Phase 7: Unit tests passing; Detox E2E scenarios written
- [ ] Phase 8: Backend adjustments (deep link URL only if needed)

---

## Notes

- Physical device testing: set `BASE_URL` in `api.ts` to your LAN IP (e.g. `192.168.1.x:3001`) instead of `10.0.2.2:3001`.
- iOS is out of scope for this plan (Xcode + Apple Developer account required).
- The backend database, migrations, and seeding are unchanged — run `docker-compose up db` + `npm run migrate` + `npm run seed` as usual.
