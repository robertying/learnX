// What patches/babel-plugin-react-compiler@1.0.0.patch changes: the compiler
// gave an identifier it wrote without a source location its own marker for
// that (a Symbol) as its `loc`. Metro's workers send each file's AST back
// with the structured clone algorithm when Expo's tree shaking is on (every
// production bundle, metro.config.js), and a Symbol can't be cloned, so
// bundling failed with "DataCloneError: Symbol() could not be cloned".
import { transformSync } from '@babel/core';

const compile = (code: string) =>
  transformSync(code, {
    filename: 'Component.jsx',
    ast: true,
    code: false,
    babelrc: false,
    configFile: false,
    parserOpts: { plugins: ['jsx'] },
    plugins: [['babel-plugin-react-compiler', { target: '19' }]],
  })?.ast;

it('leaves an AST that can be cloned', () => {
  // A renamed prop beside the rest of the props (components/ContentCard).
  const ast = compile(
    'const Card = ({ flags: own, ...rest }) => <Wrapper {...rest} />;',
  );
  expect(ast).toBeTruthy();
  expect(() => structuredClone(ast)).not.toThrow();
});
