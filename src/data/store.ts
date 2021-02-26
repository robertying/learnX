import {applyMiddleware, compose, createStore} from 'redux';
import {TypedUseSelectorHook, useSelector} from 'react-redux';
import {PersistConfig, persistReducer, persistStore} from 'redux-persist';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import AsyncStorage from '@react-native-async-storage/async-storage';
import thunk from 'redux-thunk';
import {rootReducer} from 'data/reducers/root';
import {AppState, PersistAppState} from 'data/types/state';

declare const window: any;
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const rootPersistConfig: PersistConfig<AppState> = {
  key: 'root',
  storage: AsyncStorage,
  stateReconciler: autoMergeLevel2,
  blacklist: ['auth', 'settings'],
};

const store = createStore(
  persistReducer(rootPersistConfig, rootReducer),
  composeEnhancers(applyMiddleware(thunk)),
);
const persistor = persistStore(store);

const useTypedSelector: TypedUseSelectorHook<PersistAppState> = useSelector;

export {store, persistor, useTypedSelector};
