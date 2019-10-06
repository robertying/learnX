import detox from 'detox';
import adapter from 'detox/runners/jest/adapter';
import specReporter from 'detox/runners/jest/specReporter';
import config from '../package.json';

jest.setTimeout(120000);
jasmine.getEnv().addReporter(adapter);
jasmine.getEnv().addReporter(specReporter);

beforeAll(async () => {
  await detox.init(config.detox);
});

beforeEach(async () => {
  await adapter.beforeEach();
});

afterAll(async () => {
  await adapter.afterAll();
  await detox.cleanup();
});
