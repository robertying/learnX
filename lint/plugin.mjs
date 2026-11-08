// Oxlint JS plugin with the app's own rules.

const HAN = /\p{Script=Han}/u;

/** User-visible Chinese belongs in src/assets/translations. */
const noHanOutsideTranslations = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow Chinese text in code; put it in src/assets/translations.',
    },
    messages: {
      han: 'Move this text into src/assets/translations and use t().',
    },
    schema: [],
  },
  create(context) {
    const check = (node, text) => {
      if (typeof text === 'string' && HAN.test(text)) {
        context.report({ node, messageId: 'han' });
      }
    };
    return {
      Literal: node => check(node, node.value),
      TemplateElement: node => check(node, node.value.cooked ?? node.value.raw),
      JSXText: node => check(node, node.value),
    };
  },
};

export default {
  meta: { name: 'learnx' },
  rules: {
    'no-han-outside-translations': noHanOutsideTranslations,
  },
};
