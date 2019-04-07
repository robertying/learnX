import { applyMiddleware, combineReducers, compose, createStore } from "redux";
import { PersistConfig, persistReducer, persistStore } from "redux-persist";
import createSecureStore from "redux-persist-expo-securestore";
import AsyncStorage from "redux-persist/lib/storage";
import thunk, { ThunkMiddleware } from "redux-thunk";
import authReducer from "./reducers/auth";
import { mainReducers } from "./reducers/root";
import { IAppState, IPersistAppState } from "./types/state";

declare const window: any;
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const authPersistConfig: PersistConfig = {
  key: "auth",
  storage: createSecureStore(),
  whitelist: ["username", "password"]
};
const rootPersistConfig: PersistConfig = {
  key: "root",
  storage: AsyncStorage,
  blacklist: ["auth", "toast"]
};

const rootReducer = combineReducers<IAppState, any>({
  auth: persistReducer(authPersistConfig, authReducer),
  ...mainReducers
});

const store = createStore<IPersistAppState, any, {}, {}>(
  persistReducer(rootPersistConfig, rootReducer),
  composeEnhancers(applyMiddleware(thunk as ThunkMiddleware<IPersistAppState>))
);
const persistor = persistStore(store);

export { store, persistor };
