import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  PersistorOptions,
} from 'redux-persist';
import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from 'data/reducers/root';
import { PersistAppState } from 'data/types/state';
import { AppActions } from 'data/types/actions';
import { rootPersistConfig } from 'data/persist';
import { importLegacyUserData } from 'data/legacy';

export const store = configureStore<PersistAppState, AppActions>({
  reducer: persistReducer(rootPersistConfig, rootReducer),
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});
// The one-time import of 18.0.x user data reads the stored root, so it runs
// before redux-persist rehydrates (and migrates) it.
// `manualPersist` is in redux-persist 6 but missing from its types.
export const persistor = persistStore(store, {
  manualPersist: true,
} as PersistorOptions);
importLegacyUserData().then(() => persistor.persist());

export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<
  ReturnType<typeof store.getState>
> = useSelector;
