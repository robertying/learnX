// Keeps React Native's own fetch (XMLHttpRequest-based, with the native cookie
// store the login relies on and the patched whatwg-fetch) as the global fetch:
// otherwise Expo's runtime (expo/src/winter) replaces it with expo/fetch.
// Expo reads this flag once, when its runtime first loads, so it's set in a
// module of its own that index.js imports before anything else: statements
// in index.js itself would run only after every import was evaluated.
process.env.EXPO_PUBLIC_USE_RN_FETCH = '1';
