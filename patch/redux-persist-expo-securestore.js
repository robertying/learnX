import * as SecureStore from "expo-secure-store";

export default function createSecureStorage(options = {}) {
  const replaceCharacter = options.replaceCharacter || "_";
  const replacer = options.replacer || defaultReplacer;

  return {
    getItem: key =>
      SecureStore.getItemAsync(replacer(key, replaceCharacter), options),
    setItem: (key, value) =>
      SecureStore.setItemAsync(replacer(key, replaceCharacter), value, options),
    removeItem: key =>
      SecureStore.deleteItemAsync(replacer(key, replaceCharacter), options)
  };
}

function defaultReplacer(key, replaceCharacter) {
  return key.replace(/[^a-z0-9.\-_]/gi, replaceCharacter);
}
