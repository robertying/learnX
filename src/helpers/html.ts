export const removeTags = (html: string) => {
  return html
    .replace(/<(?:.|\n)*?>/gm, "")
    .replace(/\n/g, "")
    .trim();
};
