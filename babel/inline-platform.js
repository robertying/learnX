// Rewrites calls of `isApple()`, `isAndroid()` and `isElectron()` imported
// from src/helpers/platform into `process.env.EXPO_OS === …` checks in Metro
// builds. babel-preset-expo inlines `process.env.EXPO_OS` with the platform
// being bundled, and Metro folds the result in release builds, so a branch for
// another platform (and what it requires: Android's widget layouts and
// Compose components, the Electron app's stand-ins) leaves the bundle, as
// `Platform.OS` checks do. Jest keeps the real functions, which read
// `Platform.OS` when called, so tests still switch platforms with
// `jest.replaceProperty(Platform, 'OS', …)`.
//
// Only direct calls are rewritten; a helper passed around as a value keeps
// its import. An import left with nothing to import is removed.
const path = require('path');

const PLATFORM_MODULE = path.join(
  __dirname,
  '..',
  'src',
  'helpers',
  'platform',
);

/** `Platform.OS` for each helper, as helpers/platform.ts reads it. */
const PLATFORMS = { isApple: 'ios', isAndroid: 'android', isElectron: 'web' };

/** Whether `source`, imported from `filename`, is src/helpers/platform. */
const isPlatformModule = (source, filename) =>
  source === 'helpers/platform' ||
  (source.startsWith('.') &&
    !!filename &&
    path.resolve(path.dirname(filename), source) === PLATFORM_MODULE);

function inlinePlatform(api) {
  const metro = api.caller(caller => caller?.name === 'metro');
  const t = api.types;

  return {
    name: 'learnx-inline-platform',
    visitor: metro
      ? {
          ImportDeclaration(importPath, state) {
            if (
              importPath.node.importKind === 'type' ||
              !isPlatformModule(importPath.node.source.value, state.filename)
            ) {
              return;
            }
            for (const specifier of importPath.get('specifiers')) {
              const imported = specifier.isImportSpecifier()
                ? specifier.node.imported.name
                : null;
              const os = PLATFORMS[imported];
              if (!os) {
                continue;
              }
              const binding = importPath.scope.getBinding(
                specifier.node.local.name,
              );
              let kept = false;
              for (const reference of binding?.referencePaths ?? []) {
                const call = reference.parentPath;
                if (
                  call?.isCallExpression() &&
                  call.node.callee === reference.node &&
                  call.node.arguments.length === 0
                ) {
                  call.replaceWith(
                    t.binaryExpression(
                      '===',
                      t.memberExpression(
                        t.memberExpression(
                          t.identifier('process'),
                          t.identifier('env'),
                        ),
                        t.identifier('EXPO_OS'),
                      ),
                      t.stringLiteral(os),
                    ),
                  );
                } else {
                  kept = true;
                }
              }
              if (!kept) {
                specifier.remove();
              }
            }
            if (importPath.node.specifiers.length === 0) {
              importPath.remove();
            }
          },
        }
      : {},
  };
}

inlinePlatform.isPlatformModule = isPlatformModule;
module.exports = inlinePlatform;
