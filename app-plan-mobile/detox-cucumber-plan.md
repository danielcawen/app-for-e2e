# Detox + jest-cucumber E2E Test Plan (Android)

Source app: `/Users/daniel/Documents/app-for-e2e/mobile` (from android-build-plan.md)  
Framework: Detox (device driver) + jest-cucumber (Gherkin layer) + Jest (runner)

---

## Why this combination

| Concern | Tool |
|---|---|
| Drive the Android app on emulator/device | **Detox** |
| Write tests as Gherkin feature files | **jest-cucumber** |
| Run tests and assertions | **Jest** |
| Match existing Playwright+Cucumber style | `.feature` files + step definitions |

Detox replaces Playwright. jest-cucumber replaces `@cucumber/cucumber`. The Gherkin syntax (`.feature` files) is identical — only the step definition API changes.

---

## Prerequisites

- Detox CLI: `npm install -g detox-cli`
- Android emulator running (AVD named `Pixel_7_API_34` recommended)
- App builds successfully: `cd mobile/android && ./gradlew assembleDebug assembleAndroidTest`
- Backend running locally: `docker-compose up db mailhog && cd backend && npm run dev`

---

## Phase 1 — Install and configure Detox

### Step 1.1 — Install packages

```bash
cd mobile

npm install --save-dev detox jest-cucumber @types/detox
npm install --save-dev @types/jest jest-circus
```

Why `jest-circus`? Detox requires it as the Jest test runner (default in Jest 27+, but must be explicit in config).

Verify: `npx detox --version` prints a version number.

---

### Step 1.2 — Create `.detoxrc.js`

Create `mobile/.detoxrc.js`:

```js
/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build:
        'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
    },
  },
  devices: {
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_7_API_34',
      },
    },
  },
  configurations: {
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
  },
};
```

Update `avdName` to match your AVD name (check with `emulator -list-avds`).

Verify: `npx detox build -c android.emu.debug` compiles without errors.

---

### Step 1.3 — Create `e2e/jest.config.js`

Create `mobile/e2e/jest.config.js`:

```js
/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/step-definitions/**/*.steps.js'],
  testTimeout: 120000,
  maxWorkers: 1,
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: ['detox/runners/jest/reporter'],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
};
```

`maxWorkers: 1` is required — Detox tests must run serially against a single device.

---

### Step 1.4 — Add `testID` props to React Native components

Detox finds elements by `testID`. Add them to every interactive element during Phase 3 and 4 of `android-build-plan.md`.

Reference table — add these `testID` values to your components:

| Component | Element | testID |
|---|---|---|
| LoginPage | Email input | `login-email-input` |
| LoginPage | Password input | `login-password-input` |
| LoginPage | Login button | `login-submit-btn` |
| LoginPage | Magic link tab/toggle | `login-magic-link-tab` |
| LoginPage | Magic link email input | `magic-link-email-input` |
| LoginPage | Send magic link button | `magic-link-send-btn` |
| LoginPage | Magic link confirmation text | `magic-link-sent-text` |
| LoginPage | Signup link/button | `login-signup-link` |
| SignupPage (if separate) | First name input | `signup-firstname-input` |
| SignupPage | Last name input | `signup-lastname-input` |
| SignupPage | Email input | `signup-email-input` |
| SignupPage | Password input | `signup-password-input` |
| SignupPage | Submit button | `signup-submit-btn` |
| ChatPage | Message input | `chat-message-input` |
| ChatPage | Send button | `chat-send-btn` |
| ChatPage | Message list | `chat-message-list` |
| ChatPage | Individual message | `chat-message-{id}` |
| ChatPage | Logout button | `chat-logout-btn` |
| ChatPage | Loading indicator | `chat-loading-indicator` |
| VerifyPage | Status text | `verify-status-text` |
| Error/toast text | Any error display | `error-message-text` |

Example in `LoginPage.tsx`:
```tsx
<TextInput
  testID="login-email-input"
  value={email}
  onChangeText={setEmail}
  placeholder="Email"
  keyboardType="email-address"
  autoCapitalize="none"
/>
```

Verify: `element(by.id('login-email-input'))` resolves in a Detox test without throwing.

---

## Phase 2 — Folder structure

```
mobile/
  e2e/
    jest.config.js
    features/
      auth.feature
      chat.feature
    step-definitions/
      auth.steps.js
      chat.steps.js
    helpers/
      auth.helper.js
      device.helper.js
    support/
      world.js
    fixtures/
      users.js
```

Create the directories:

```bash
mkdir -p mobile/e2e/{features,step-definitions,helpers,support,fixtures}
```

---

## Phase 3 — Feature files

### Step 3.1 — `e2e/features/auth.feature`

```gherkin
Feature: Authentication

  Background:
    Given the app is launched fresh

  Scenario: Login with email and password
    Given I am on the login screen
    When I enter email "test@example.com" and password "Password123!"
    And I tap the login button
    Then I should be on the chat screen

  Scenario: Login fails with wrong password
    Given I am on the login screen
    When I enter email "test@example.com" and password "wrongpassword"
    And I tap the login button
    Then I should see an error message

  Scenario: Send magic link
    Given I am on the login screen
    When I switch to magic link mode
    And I enter email "test@example.com" for magic link
    And I tap send magic link
    Then I should see a magic link confirmation

  Scenario: Sign up new user
    Given I am on the login screen
    When I navigate to sign up
    And I fill in signup details with email "newuser@example.com" and password "Password123!"
    And I submit the signup form
    Then I should be on the chat screen

  Scenario: Session persists after app restart
    Given I am logged in as "test@example.com" with password "Password123!"
    When the app is restarted
    Then I should be on the chat screen without logging in again

  Scenario: Logout
    Given I am logged in as "test@example.com" with password "Password123!"
    When I tap the logout button
    Then I should be on the login screen
```

---

### Step 3.2 — `e2e/features/chat.feature`

```gherkin
Feature: Chat

  Background:
    Given I am logged in as "test@example.com" with password "Password123!"
    And I am on the chat screen

  Scenario: Send a message and receive AI response
    When I type "Hello, how are you?" in the message input
    And I tap the send button
    Then I should see my message "Hello, how are you?" in the chat
    And I should see an AI response in the chat

  Scenario: Message input clears after sending
    When I type "Hello world" in the message input
    And I tap the send button
    Then the message input should be empty

  Scenario: Loading indicator appears while AI responds
    When I type "Tell me a long story" in the message input
    And I tap the send button
    Then I should see a loading indicator
    And the loading indicator should disappear after the AI responds

  Scenario: Delete a message
    Given I have sent the message "Delete me please"
    When I long press on the message "Delete me please"
    And I confirm the delete action
    Then the message "Delete me please" should not be visible

  Scenario: Cannot send empty message
    When I leave the message input empty
    Then the send button should be disabled

  Scenario: Chat history loads on screen open
    Given I have previously sent messages in this session
    When I navigate away and return to chat
    Then my previous messages should be visible
```

---

## Phase 4 — Fixtures and helpers

### Step 4.1 — `e2e/fixtures/users.js`

```js
module.exports = {
  testUser: {
    email: 'test@example.com',
    password: 'Password123!',
    firstName: 'Test',
    lastName: 'User',
  },
  newUser: {
    // Generated fresh each run to avoid conflicts
    email: `e2e-${Date.now()}@example.com`,
    password: 'Password123!',
  },
};
```

---

### Step 4.2 — `e2e/helpers/auth.helper.js`

Reusable login shortcut — skips the UI to speed up scenarios that don't test auth itself.

```js
const { device, element, by, expect } = require('detox');

/**
 * Logs in via the UI. Used by Background steps that need an authenticated state.
 */
async function loginViaUI(email, password) {
  await element(by.id('login-email-input')).typeText(email);
  await element(by.id('login-password-input')).typeText(password);
  await element(by.id('login-submit-btn')).tap();
  await expect(element(by.id('chat-message-input'))).toBeVisible();
}

/**
 * Logs in by calling the API directly, then relaunches the app with the token
 * already in AsyncStorage. Faster than loginViaUI for non-auth scenarios.
 */
async function loginViaAPI(email, password) {
  const axios = require('axios');
  const BASE_URL = 'http://10.0.2.2:3001/api';

  const res = await axios.post(`${BASE_URL}/auth/login`, { email, password });
  const { token } = res.data.data;

  // Write token to AsyncStorage via Detox's setURLBlacklist workaround:
  // Relaunch with launch args so the app reads it at startup.
  await device.launchApp({
    newInstance: true,
    launchArgs: { e2eToken: token },
  });
}

module.exports = { loginViaUI, loginViaAPI };
```

Note: `loginViaAPI` requires a small hook in the mobile app's startup code to read `e2eToken` from launch args and write it to `AsyncStorage` when `__DEV__` is true. Add to `mobile/src/App.tsx`:

```ts
import { NativeModules } from 'react-native';

// Only in __DEV__ — ignored in release builds
if (__DEV__) {
  const e2eToken = NativeModules.DevSettings?.e2eToken
    ?? global.__detoxLaunchArgs?.e2eToken;
  if (e2eToken) {
    AsyncStorage.setItem('token', e2eToken);
  }
}
```

---

### Step 4.3 — `e2e/helpers/device.helper.js`

```js
const { device } = require('detox');

async function relaunchApp() {
  await device.launchApp({ newInstance: true });
}

async function relaunchFresh() {
  await device.launchApp({
    newInstance: true,
    delete: true, // clears AsyncStorage (wipes app data)
  });
}

module.exports = { relaunchApp, relaunchFresh };
```

---

## Phase 5 — Step definitions

### Step 5.1 — `e2e/step-definitions/auth.steps.js`

```js
const { defineFeature, loadFeature } = require('jest-cucumber');
const { element, by, expect, device } = require('detox');
const { loginViaUI, loginViaAPI } = require('../helpers/auth.helper');
const { relaunchFresh, relaunchApp } = require('../helpers/device.helper');
const users = require('../fixtures/users');

const feature = loadFeature('./e2e/features/auth.feature');

defineFeature(feature, (test) => {

  // ─── Background ────────────────────────────────────────────────────────────

  beforeEach(async () => {
    // "Given the app is launched fresh" is handled per-test
  });

  // ─── Scenario: Login with email and password ────────────────────────────────

  test('Login with email and password', ({ given, when, and, then }) => {
    given('the app is launched fresh', async () => {
      await relaunchFresh();
    });

    given('I am on the login screen', async () => {
      await expect(element(by.id('login-email-input'))).toBeVisible();
    });

    when(/I enter email "(.*)" and password "(.*)"/, async (email, password) => {
      await element(by.id('login-email-input')).typeText(email);
      await element(by.id('login-password-input')).typeText(password);
    });

    and('I tap the login button', async () => {
      await element(by.id('login-submit-btn')).tap();
    });

    then('I should be on the chat screen', async () => {
      await expect(element(by.id('chat-message-input'))).toBeVisible();
    });
  });

  // ─── Scenario: Login fails with wrong password ──────────────────────────────

  test('Login fails with wrong password', ({ given, when, and, then }) => {
    given('the app is launched fresh', async () => {
      await relaunchFresh();
    });

    given('I am on the login screen', async () => {
      await expect(element(by.id('login-email-input'))).toBeVisible();
    });

    when(/I enter email "(.*)" and password "(.*)"/, async (email, password) => {
      await element(by.id('login-email-input')).typeText(email);
      await element(by.id('login-password-input')).typeText(password);
    });

    and('I tap the login button', async () => {
      await element(by.id('login-submit-btn')).tap();
    });

    then('I should see an error message', async () => {
      await expect(element(by.id('error-message-text'))).toBeVisible();
    });
  });

  // ─── Scenario: Send magic link ──────────────────────────────────────────────

  test('Send magic link', ({ given, when, and, then }) => {
    given('the app is launched fresh', async () => {
      await relaunchFresh();
    });

    given('I am on the login screen', async () => {
      await expect(element(by.id('login-email-input'))).toBeVisible();
    });

    when('I switch to magic link mode', async () => {
      await element(by.id('login-magic-link-tab')).tap();
    });

    and(/I enter email "(.*)" for magic link/, async (email) => {
      await element(by.id('magic-link-email-input')).typeText(email);
    });

    and('I tap send magic link', async () => {
      await element(by.id('magic-link-send-btn')).tap();
    });

    then('I should see a magic link confirmation', async () => {
      await expect(element(by.id('magic-link-sent-text'))).toBeVisible();
    });
  });

  // ─── Scenario: Sign up new user ─────────────────────────────────────────────

  test('Sign up new user', ({ given, when, and, then }) => {
    given('the app is launched fresh', async () => {
      await relaunchFresh();
    });

    given('I am on the login screen', async () => {
      await expect(element(by.id('login-email-input'))).toBeVisible();
    });

    when('I navigate to sign up', async () => {
      await element(by.id('login-signup-link')).tap();
    });

    and(/I fill in signup details with email "(.*)" and password "(.*)"/, async (email, password) => {
      await element(by.id('signup-email-input')).typeText(email);
      await element(by.id('signup-password-input')).typeText(password);
    });

    and('I submit the signup form', async () => {
      await element(by.id('signup-submit-btn')).tap();
    });

    then('I should be on the chat screen', async () => {
      await expect(element(by.id('chat-message-input'))).toBeVisible();
    });
  });

  // ─── Scenario: Session persists after app restart ───────────────────────────

  test('Session persists after app restart', ({ given, when, then }) => {
    given('the app is launched fresh', async () => {
      await relaunchFresh();
    });

    given(/I am logged in as "(.*)" with password "(.*)"/, async (email, password) => {
      await loginViaUI(email, password);
    });

    when('the app is restarted', async () => {
      await relaunchApp(); // does NOT clear AsyncStorage
    });

    then('I should be on the chat screen without logging in again', async () => {
      await expect(element(by.id('chat-message-input'))).toBeVisible();
    });
  });

  // ─── Scenario: Logout ───────────────────────────────────────────────────────

  test('Logout', ({ given, when, then }) => {
    given('the app is launched fresh', async () => {
      await relaunchFresh();
    });

    given(/I am logged in as "(.*)" with password "(.*)"/, async (email, password) => {
      await loginViaUI(email, password);
    });

    when('I tap the logout button', async () => {
      await element(by.id('chat-logout-btn')).tap();
    });

    then('I should be on the login screen', async () => {
      await expect(element(by.id('login-email-input'))).toBeVisible();
    });
  });

});
```

---

### Step 5.2 — `e2e/step-definitions/chat.steps.js`

```js
const { defineFeature, loadFeature } = require('jest-cucumber');
const { element, by, expect, waitFor } = require('detox');
const { loginViaUI } = require('../helpers/auth.helper');
const { relaunchFresh } = require('../helpers/device.helper');

const feature = loadFeature('./e2e/features/chat.feature');

defineFeature(feature, (test) => {

  // ─── Background ────────────────────────────────────────────────────────────

  // Shared Background step — runs before each scenario in this feature
  const sharedBackground = (given, and) => {
    given('the app is launched fresh', async () => {
      await relaunchFresh();
    });

    given(/I am logged in as "(.*)" with password "(.*)"/, async (email, password) => {
      await loginViaUI(email, password);
    });

    and('I am on the chat screen', async () => {
      await expect(element(by.id('chat-message-input'))).toBeVisible();
    });
  };

  // ─── Scenario: Send a message and receive AI response ───────────────────────

  test('Send a message and receive AI response', ({ given, and, when, then }) => {
    sharedBackground(given, and);

    when(/I type "(.*)" in the message input/, async (message) => {
      await element(by.id('chat-message-input')).typeText(message);
    });

    and('I tap the send button', async () => {
      await element(by.id('chat-send-btn')).tap();
    });

    then(/I should see my message "(.*)" in the chat/, async (message) => {
      await expect(element(by.text(message))).toBeVisible();
    });

    and('I should see an AI response in the chat', async () => {
      // Wait up to 30s for AI response (mock or real)
      await waitFor(element(by.id('chat-message-list')))
        .toHaveDescendant(element(by.traits(['staticText'])))
        .withTimeout(30000);
    });
  });

  // ─── Scenario: Message input clears after sending ───────────────────────────

  test('Message input clears after sending', ({ given, and, when, then }) => {
    sharedBackground(given, and);

    when(/I type "(.*)" in the message input/, async (message) => {
      await element(by.id('chat-message-input')).typeText(message);
    });

    and('I tap the send button', async () => {
      await element(by.id('chat-send-btn')).tap();
    });

    then('the message input should be empty', async () => {
      await expect(element(by.id('chat-message-input'))).toHaveText('');
    });
  });

  // ─── Scenario: Loading indicator appears while AI responds ──────────────────

  test('Loading indicator appears while AI responds', ({ given, and, when, then }) => {
    sharedBackground(given, and);

    when(/I type "(.*)" in the message input/, async (message) => {
      await element(by.id('chat-message-input')).typeText(message);
    });

    and('I tap the send button', async () => {
      await element(by.id('chat-send-btn')).tap();
    });

    then('I should see a loading indicator', async () => {
      await expect(element(by.id('chat-loading-indicator'))).toBeVisible();
    });

    and('the loading indicator should disappear after the AI responds', async () => {
      await waitFor(element(by.id('chat-loading-indicator')))
        .not.toBeVisible()
        .withTimeout(30000);
    });
  });

  // ─── Scenario: Delete a message ─────────────────────────────────────────────

  test('Delete a message', ({ given, and, when, then }) => {
    sharedBackground(given, and);

    given(/I have sent the message "(.*)"/, async (message) => {
      await element(by.id('chat-message-input')).typeText(message);
      await element(by.id('chat-send-btn')).tap();
      await expect(element(by.text(message))).toBeVisible();
    });

    when(/I long press on the message "(.*)"/, async (message) => {
      await element(by.text(message)).longPress();
    });

    and('I confirm the delete action', async () => {
      // Assumes a confirmation dialog or modal with a "Delete" button
      await element(by.text('Delete')).tap();
    });

    then(/the message "(.*)" should not be visible/, async (message) => {
      await expect(element(by.text(message))).not.toBeVisible();
    });
  });

  // ─── Scenario: Cannot send empty message ────────────────────────────────────

  test('Cannot send empty message', ({ given, and, when, then }) => {
    sharedBackground(given, and);

    when('I leave the message input empty', async () => {
      await element(by.id('chat-message-input')).clearText();
    });

    then('the send button should be disabled', async () => {
      await expect(element(by.id('chat-send-btn'))).not.toBeEnabled();
    });
  });

  // ─── Scenario: Chat history loads on screen open ────────────────────────────

  test('Chat history loads on screen open', ({ given, and, when, then }) => {
    sharedBackground(given, and);

    given('I have previously sent messages in this session', async () => {
      await element(by.id('chat-message-input')).typeText('History test message');
      await element(by.id('chat-send-btn')).tap();
      await expect(element(by.text('History test message'))).toBeVisible();
    });

    when('I navigate away and return to chat', async () => {
      // Put app in background and foreground — simulates leaving and returning
      await device.sendToHome();
      await device.launchApp({ newInstance: false });
    });

    then('my previous messages should be visible', async () => {
      await expect(element(by.text('History test message'))).toBeVisible();
    });
  });

});
```

---

## Phase 6 — Running tests

### Step 6.1 — Add npm scripts to `mobile/package.json`

```json
{
  "scripts": {
    "e2e:build": "detox build -c android.emu.debug",
    "e2e:test": "detox test -c android.emu.debug",
    "e2e:test:auth": "detox test -c android.emu.debug --testNamePattern='Authentication'",
    "e2e:test:chat": "detox test -c android.emu.debug --testNamePattern='Chat'",
    "e2e:clean": "detox clean-framework-cache && detox build-framework-cache"
  }
}
```

### Step 6.2 — Standard run sequence

```bash
# 1. Ensure emulator is running
emulator -avd Pixel_7_API_34 &

# 2. Ensure backend is up
docker-compose up -d db mailhog
cd backend && npm run dev &

# 3. Build APK (only needed when app code changes)
cd mobile
npm run e2e:build

# 4. Run all E2E tests
npm run e2e:test

# 5. Run a single feature
npm run e2e:test:auth
```

### Step 6.3 — Re-run without rebuild

If only test code changed (no app code change), skip the build:

```bash
detox test -c android.emu.debug --reuse
```

`--reuse` skips reinstalling the APK and reuses the one already on the emulator.

Verify: Tests run in ~60s per scenario with `--reuse`, ~5min for a full build+test cycle.

---

## Phase 7 — Test data management

### Step 7.1 — Seed the test user before the suite

Create `mobile/e2e/support/globalSetup.js` and reference it in `jest.config.js`:

```js
// e2e/support/globalSetup.js
const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:3001/api';
const TEST_USER = { email: 'test@example.com', password: 'Password123!' };

module.exports = async () => {
  // Ensure test user exists — idempotent, ignores 409 (already exists)
  try {
    await axios.post(`${BASE_URL}/auth/signup`, TEST_USER);
  } catch (err) {
    if (err.response?.status !== 409) throw err;
  }
  console.log('E2E test user ready:', TEST_USER.email);
};
```

Update `e2e/jest.config.js`:

```js
module.exports = {
  // ...existing config...
  globalSetup: './e2e/support/globalSetup.js',  // runs before Detox global setup
};
```

Wait — Jest only supports one `globalSetup`. Chain them:

```js
// e2e/support/globalSetup.js
const detoxSetup = require('detox/runners/jest/globalSetup');

module.exports = async () => {
  await seedTestUser();    // seed first
  await detoxSetup();      // then Detox boots the emulator
};

async function seedTestUser() {
  const axios = require('axios');
  try {
    await axios.post('http://127.0.0.1:3001/api/auth/signup', {
      email: 'test@example.com',
      password: 'Password123!',
    });
  } catch (err) {
    if (err.response?.status !== 409) throw err;
  }
}
```

Update `jest.config.js`:

```js
globalSetup: './e2e/support/globalSetup.js',  // replaces 'detox/runners/jest/globalSetup'
```

Verify: Running `npm run e2e:test` on a fresh DB creates `test@example.com` before any test runs.

---

## Phase 8 — jest-cucumber wiring details

### Step 8.1 — How `defineFeature` maps to the `.feature` file

```
loadFeature('./e2e/features/auth.feature')
  → reads the .feature file at runtime
  → returns a feature object

defineFeature(feature, (test) => {
  test('Scenario title exactly as written in .feature', ({ given, when, and, then }) => {
    given('step text', async () => { /* Detox code */ });
  });
});
```

Rules:
- The string passed to `test()` must match the `Scenario:` title **exactly** (case-sensitive).
- Step strings can be plain strings or regex. Use regex (`/pattern/`) for steps with variables.
- `and` steps reuse the most recent keyword type — jest-cucumber treats `and` as an alias.

### Step 8.2 — Background steps in jest-cucumber

jest-cucumber does NOT auto-run `Background:` steps. You must call them manually in each `test()` block, or extract them into a helper function and call it at the start of each test (as shown in `chat.steps.js` with `sharedBackground`).

### Step 8.3 — Sharing steps between feature files

If `Given I am on the login screen` appears in both `auth.feature` and `chat.feature`, extract the step into a shared helper rather than duplicating:

```js
// e2e/helpers/steps.shared.js
const { element, by, expect } = require('detox');

module.exports = {
  async givenOnLoginScreen() {
    await expect(element(by.id('login-email-input'))).toBeVisible();
  },
};
```

Import and call it in each step file.

---

## Phase 9 — Mapping to existing Playwright+Cucumber conventions

| Playwright+Cucumber (web) | Detox+jest-cucumber (mobile) |
|---|---|
| `page.fill('[data-testid="email"]', value)` | `element(by.id('login-email-input')).typeText(value)` |
| `page.click('[data-testid="submit"]')` | `element(by.id('login-submit-btn')).tap()` |
| `expect(page.locator(...)).toBeVisible()` | `expect(element(by.id(...))).toBeVisible()` |
| `page.waitForSelector(...)` | `waitFor(element(...)).toBeVisible().withTimeout(ms)` |
| `page.goto('/login')` | N/A — navigate via the app UI or relaunch |
| `@cucumber/cucumber` hooks | `beforeEach` / `afterEach` in Jest |
| `world` context | Shared variables in closure scope of `defineFeature` |
| `.feature` files | Identical Gherkin syntax — no changes needed |

The `.feature` files themselves can be copied from the web suite and reused with minor edits (URL navigation steps removed; testID-based steps substituted).

---

## Delivery checklist

- [ ] Phase 1: Detox installed, `.detoxrc.js` configured, `detox build` succeeds
- [ ] Phase 1.4: All `testID` props added to mobile components
- [ ] Phase 2: `e2e/` folder structure created
- [ ] Phase 3: `auth.feature` and `chat.feature` written
- [ ] Phase 4: Fixtures and helpers in place; `loginViaUI` and `loginViaAPI` tested
- [ ] Phase 5: Step definitions written; all steps resolve without "step not found" errors
- [ ] Phase 6: `npm run e2e:test` runs and all scenarios pass on emulator
- [ ] Phase 7: Global setup seeds test user; tests are idempotent (can re-run without DB reset)
- [ ] Phase 8: Background steps handled correctly; no duplicate step code
- [ ] Phase 9: Team familiar with API differences vs Playwright

---

## Common errors and fixes

| Error | Cause | Fix |
|---|---|---|
| `Cannot find element by id "login-email-input"` | `testID` not set on component | Add `testID` prop to the React Native element |
| `Step "Given the app is launched fresh" not found` | Scenario title mismatch | Check `.feature` title matches `test()` string exactly |
| `ECONNREFUSED 10.0.2.2:3001` | Backend not running | Start backend; use `10.0.2.2` not `localhost` on emulator |
| `Timeout 120000ms exceeded` | Element not appearing | Check navigation guard; add `waitFor(...).toBeVisible()` |
| `Cannot read property 'data' of undefined` (globalSetup) | Backend not up before setup | Start backend before running `npm run e2e:test` |
| `detox[android.emu.debug][WARN] No such AVD` | AVD name mismatch | Run `emulator -list-avds` and update `.detoxrc.js` |
| `Tests must run serially` | `maxWorkers` not set to 1 | Set `maxWorkers: 1` in `jest.config.js` |
