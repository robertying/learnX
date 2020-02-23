import AsyncStorage from '@react-native-community/async-storage';
import {applyMiddleware, combineReducers, compose, createStore} from 'redux';
import {PersistConfig, persistReducer, persistStore} from 'redux-persist';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import createSecureStore from 'redux-persist-expo-securestore';
import thunk from 'redux-thunk';
import authReducer from './reducers/auth';
import {mainReducers, rootReducer} from './reducers/root';
import {IAppState, IAuthState} from './types/state';
import {TypedUseSelectorHook, useSelector, useDispatch} from 'react-redux';

declare const window: any;
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const authPersistConfig: PersistConfig<IAuthState> = {
  key: 'auth',
  storage: createSecureStore(),
  whitelist: ['username', 'password'],
};
const rootPersistConfig: PersistConfig<IAppState> = {
  key: 'root',
  storage: AsyncStorage,
  stateReconciler: autoMergeLevel2,
  blacklist: ['auth'],
};

const appReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  ...mainReducers,
});

const store = createStore(
  persistReducer(rootPersistConfig, rootReducer),
  composeEnhancers(applyMiddleware(thunk)),
);
const persistor = persistStore(store);

const useTypedSelector: TypedUseSelectorHook<IAppState> = useSelector;
const useTypedDispatch = () => useDispatch<typeof store.dispatch>();

export {appReducer, store, persistor, useTypedSelector, useTypedDispatch};
