import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';
import CookieManager from '@react-native-community/cookies';
import {decode} from 'js-base64';
import {Platform} from 'react-native';

declare const preval: any;
const raw = preval`
      const fs = require('fs');
      const path = require('path');
      let str;
      if (process.cwd().includes("ios")) {
        str = fs.readFileSync(path.resolve(process.cwd(), '../.env'), 'utf8');
      } else {
        str = fs.readFileSync(path.resolve(process.cwd(), './.env'), 'utf8');
      }
      module.exports = str
`;
const json = JSON.parse(raw);

const poolData = {
  UserPoolId: json.userPoolId,
  ClientId: json.clientId,
};
const userPool = new CognitoUserPool(poolData);

const authenticationData = {
  Username: json.a,
  Password: decode(json.b),
};
const authenticationDetails = new AuthenticationDetails(authenticationData);
const userData = {
  Username: json.a,
  Pool: userPool,
};
const cognitoUser = new CognitoUser(userData);

export const loginLearnX = () => {
  return new Promise((resolve, reject) =>
    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: function (result) {
        return resolve(result);
      },

      onFailure: function (err) {
        return reject(err);
      },
    }),
  );
};

export const getLearnXCredentials = () => {
  return new Promise<{
    idToken: string;
    accessToken: string;
    refreshToken: string;
  } | null>((resolve) =>
    (userPool as any).storage.sync(function (err: Error, result: string) {
      if (err) {
        return resolve(null);
      } else if (result === 'SUCCESS') {
        const cognitoUser = userPool.getCurrentUser();

        if (cognitoUser === null) {
          return resolve(null);
        }

        cognitoUser.getSession(function (
          err: Error,
          session: CognitoUserSession,
        ) {
          if (err) {
            return resolve(null);
          }

          return resolve({
            idToken: session.getIdToken().getJwtToken(),
            accessToken: session.getAccessToken().getJwtToken(),
            refreshToken: session.getRefreshToken().getToken(),
          });
        });
      }
    }),
  );
};

const THURSDAY_URL = 'https://thu.community';
const DOMAIN = '.thu.community';

const setCookie = (name: string, value: string) =>
  Platform.OS === 'ios'
    ? CookieManager.set(
        THURSDAY_URL,
        {
          name,
          value,
          domain: DOMAIN,
          secure: true,
          httpOnly: false,
        },
        true,
      )
    : CookieManager.setFromResponse(
        THURSDAY_URL,
        `${name}=${value}; Domain=${DOMAIN}; Path=/; Secure;`,
      );

export const setCookieFromCredentials = async () => {
  const credentials = await getLearnXCredentials();
  if (!credentials) {
    return;
  }

  await CookieManager.clearAll(true);

  await setCookie(
    `CognitoIdentityServiceProvider.${json.clientId}.LastAuthUser`,
    json.a,
  );
  await setCookie(
    `CognitoIdentityServiceProvider.${json.clientId}.${json.a}.accessToken`,
    credentials.accessToken,
  );
  await setCookie(
    `CognitoIdentityServiceProvider.${json.clientId}.${json.a}.refreshToken`,
    credentials.refreshToken,
  );
  await setCookie(
    `CognitoIdentityServiceProvider.${json.clientId}.${json.a}.idToken`,
    credentials.idToken,
  );
};
