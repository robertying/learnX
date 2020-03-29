import AsyncStorage from '@react-native-community/async-storage';
import {applyMiddleware, combineReducers, compose, createStore} from 'redux';
import {PersistConfig, persistReducer, persistStore} from 'redux-persist';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import createSecureStore from 'redux-persist-expo-securestore';
import thunk from 'redux-thunk';
import authReducer from './reducers/auth';
import settingsReducer from './reducers/settings';
import {mainReducers, rootReducer} from './reducers/root';
import {
  IAppState,
  IAuthState,
  IPersistAppState,
  ISettingsState,
} from './types/state';
import {TypedUseSelectorHook, useSelector} from 'react-redux';

declare const window: any;
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const authPersistConfig: PersistConfig<IAuthState> = {
  key: 'auth',
  storage: createSecureStore(),
  whitelist: ['username', 'password', 'firebase'],
};
const settingsPersistConfig: PersistConfig<ISettingsState> = {
  key: 'settings',
  storage: AsyncStorage,
  blacklist: ['hasUpdate', 'isCompact'],
};
const rootPersistConfig: PersistConfig<IAppState> = {
  key: 'root',
  storage: AsyncStorage,
  stateReconciler: autoMergeLevel2,
  blacklist: ['auth', 'settings'],
};

const appReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  settings: persistReducer(settingsPersistConfig, settingsReducer),
  ...mainReducers,
});

const store = createStore(
  persistReducer(rootPersistConfig, rootReducer),
  composeEnhancers(applyMiddleware(thunk)),
);
const persistor = persistStore(store);

const useTypedSelector: TypedUseSelectorHook<IPersistAppState> = useSelector;

export {appReducer, store, persistor, useTypedSelector};
