import {Learn2018Helper} from 'thu-learn-lib-no-native';

let dataSource = new Learn2018Helper();

const setCredentials = (username: string, password: string) => {
  dataSource = new Learn2018Helper({
    provider: () => ({
      username: username!,
      password: password!,
    }),
  });
};

export {setCredentials, dataSource};
