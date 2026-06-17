# DSA Daily Challenge — Mobile App

React Native + Expo client for **DSA Daily Challenge**. Users get a small set of
interactive Data Structures & Algorithms tasks every day (predict Bubble Sort
swaps, drag/tap through Linked List ops, tap Binary Search midpoints, predict
Stack/Queue states), submit their predictions, and earn points, streaks, and
badges. A separate **Minh họa** (illustration) tab offers self-contained,
non-scored interactive demos of the same five topics for studying.

The mobile app never decides whether an answer is correct — it only renders
challenges and captures the user's predicted actions. The backend (NestJS API)
validates everything, computes scores, streaks, and the leaderboard.

## Tech stack

- Expo (React Native), TypeScript
- React Navigation (native-stack + bottom-tabs)
- Zustand for client state
- Axios for the API client
- expo-secure-store for token persistence on device (falls back to
  `localStorage` on web, since `expo-secure-store` has no web implementation)

## Install dependencies

```bash
cd mobile
npm install
```

## Configure the API URL

The app reads its backend base URL from the `EXPO_PUBLIC_API_URL` environment
variable (bundled at build time — see `src/services/api.ts`).

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env`:
   ```
   EXPO_PUBLIC_API_URL=http://localhost:3000/api
   ```

**Important if you're testing on a real iOS device with Expo Go:** the phone
is a separate machine from your computer, so `localhost` on the phone means
*the phone itself*, not your dev machine. Replace `localhost` with your
computer's LAN IP address (e.g. `http://192.168.1.50:3000/api`), and make sure
the phone and computer are on the same Wi-Fi network and that your backend is
listening on `0.0.0.0` (not just `127.0.0.1`).

For production/EAS builds, `EXPO_PUBLIC_API_URL` **must** be `https://` — iOS
blocks plain HTTP requests by default. See `.env.production` for the
Render-hosted backend URL used in release builds.

## Run on a real iPhone via Expo Go

1. Install **Expo Go** from the App Store on the iPhone.
2. Make sure `.env` points at a backend URL reachable from the phone (see
   above — LAN IP, not `localhost`).
3. Start the dev server from `mobile/`:
   ```bash
   npm start
   ```
4. Scan the QR code shown in the terminal/browser with the iPhone's Camera
   app (or directly inside Expo Go) — same Wi-Fi network as your computer. If
   the network blocks LAN connections (e.g. some corporate/public Wi-Fi), run
   `npx expo start --tunnel` instead.
5. The app opens inside Expo Go and hot-reloads as you edit source files.

Other scripts (`npm run android`, `npm run ios`, `npm run web`) launch an
Android emulator, iOS Simulator, or a web build respectively — useful for
local iteration, but the iOS Simulator is not a substitute for testing on a
real device before shipping.

## Screens

| Screen | File | Description |
|---|---|---|
| Login | `src/screens/auth/LoginScreen.tsx` | Email/password sign-in; on success stores the token and routes into the main app. |
| Register | `src/screens/auth/RegisterScreen.tsx` | Creates a new account (name, email, password, optional class) and logs the user in immediately. |
| Home | `src/screens/home/HomeScreen.tsx` | Daily dashboard — greeting, streak/points pills, overall progress, per-subject challenge cards, weekly calendar, latest badge. |
| Subject | `src/screens/challenge/SubjectScreen.tsx` | Lists the tasks for one subject (e.g. Bubble Sort) with difficulty and attempts-remaining, and locks tasks after 3 attempts. |
| Challenge | `src/screens/challenge/ChallengeScreen.tsx` | Hosts the interactive challenge UI for a single task via `ChallengeRenderer`. |
| Leaderboard | `src/screens/leaderboard/LeaderboardScreen.tsx` | Weekly ranking list with medals for the top 3 and the current user highlighted. |
| Profile | `src/screens/profile/ProfileScreen.tsx` | Full profile view — avatar, streak hero stat, earned badge grid, logout. |
| Learn Home | `src/screens/learn/LearnHomeScreen.tsx` | Menu of the five DSA topics available as non-scored interactive illustrations. |
| Learn Detail | `src/screens/learn/LearnDetailScreen.tsx` | Concept explanation, step-by-step walkthrough, interactive demo, and complexity table for one topic. |

See `LOGIC.md` for a full technical breakdown of every file and the
end-to-end data flow from app launch to completing a daily challenge.
