// Jest's transform of the Electron app (electron/), which Node and Electron
// run as ES modules: what ES modules have there, in the CommonJS module Jest
// runs each file as (jest.config.js's `tooling` project).
//
// - `import.meta.dirname` and `.filename`: `__dirname` and `__filename`;
//   `.url`: the file's URL; `.main`: false (never the entry point in a test).
//   babel-preset-expo would turn them into Expo's own registry instead.
//   Anything else from `import.meta` is an error, rather than undefined.
// - `import(specifier)`: Jest's `require`, so its module registry (and
//   `jest.mock`) applies, as a namespace the way Node makes one of a CommonJS
//   module: its exports, and `default` for `module.exports`. Jest's own
//   `import()` needs its experimental VM modules.
module.exports = ({ template, types: t }) => ({
  name: 'jest-node-esm',
  visitor: {
    MetaProperty(metaPath) {
      const { node, parentPath } = metaPath;
      if (node.meta.name !== 'import' || node.property.name !== 'meta') {
        return;
      }
      const name =
        parentPath.isMemberExpression() && !parentPath.node.computed
          ? parentPath.node.property.name
          : undefined;
      switch (name) {
        case 'dirname':
          parentPath.replaceWith(t.identifier('__dirname'));
          return;
        case 'filename':
          parentPath.replaceWith(t.identifier('__filename'));
          return;
        case 'url':
          parentPath.replaceWith(
            template.expression
              .ast`require('node:url').pathToFileURL(__filename).href`,
          );
          return;
        case 'main':
          parentPath.replaceWith(t.booleanLiteral(false));
          return;
        default:
          throw metaPath.buildCodeFrameError(
            `import.meta${name ? `.${name}` : ''} has no stand-in in Jest (babel/jest-node-esm.js)`,
          );
      }
    },
    CallExpression(callPath) {
      if (!t.isImport(callPath.node.callee)) {
        return;
      }
      const [specifier] = callPath.node.arguments;
      callPath.replaceWith(
        template.expression.ast`Promise.resolve().then(() => {
          const exported = require(${specifier});
          return Object.create(exported, {
            default: { value: exported, enumerable: true },
          });
        })`,
      );
    },
  },
});
