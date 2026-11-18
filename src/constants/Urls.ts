import { isLocaleChinese } from 'helpers/i18n';

const Urls = {
  learn: 'https://learn.tsinghua.edu.cn',
  id: 'https://id.tsinghua.edu.cn',
  /** learnX on GitHub: releases, issues, source. */
  repo: 'https://github.com/robertying/learnX',
  /** learnX's website (tsinghua.app, built from the README). */
  website: 'https://tsinghua.app/learnX',
};

export default Urls;

/**
 * The privacy policy in the app's language: the files in docs/, which the
 * store listings link to as well.
 */
export const privacyPolicyUrl = () =>
  `${Urls.repo}/blob/main/docs/PRIVACY_POLICY_${isLocaleChinese() ? 'CN' : 'EN'}.md`;

/** Where feedback and maintainer offers go (Help, Become a Maintainer). */
export const supportEmail = 'learnX@ruiying.io';
