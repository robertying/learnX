/**
 * Matching and ranking for search, built for Chinese first.
 *
 * A query is split into words at spaces and wherever Han text meets other
 * text (`tcp拥塞` is `tcp` and `拥塞`). Every word has to match some field of
 * an item, exactly: one wrong character is a different word in Chinese, so
 * there is no fuzzy matching here (`useSearch` adds a fuzzy pass for English
 * typos when nothing matches). A Han word that no field holds whole may still
 * match in pieces held by different fields, since queries are typed without
 * spaces (`数据结构作业` is the course 数据结构 and the title 作业), and a
 * course name or title also matches its abbreviation (`计网` for 计算机网络).
 *
 * Results are ranked by where each word matched (the field's tier), then how
 * (the whole field, its start or a word's start, inside it, an abbreviation,
 * in pieces), then by what needs attention (`SearchSpec.attention`), and
 * otherwise keep the order of the list they came from.
 */

/** How much a match in a field counts, from the title down to the body. */
export const SearchTier = {
  Body: 1,
  Person: 2,
  Name: 3,
  Course: 4,
  Title: 5,
} as const;
export type SearchTier = (typeof SearchTier)[keyof typeof SearchTier];

export interface SearchField<T> {
  /** The field's plain text, or several (like attachment names). */
  get: (item: T) => string | null | undefined | (string | null | undefined)[];
  tier: SearchTier;
  /** Whether an abbreviation of the field matches (course names, titles). */
  abbreviations?: boolean;
}

export interface SearchSpec<T> {
  fields: SearchField<T>[];
  /**
   * Whether an item needs attention (an assignment still to hand in, an
   * unread notice), which puts it before others whose matches rank the same.
   * `now` is when the search ran, in milliseconds.
   */
  attention: (item: T, now: number) => boolean;
}

/** How a word matched a field, added to the field's tier. */
const Kind = {
  Abbreviation: 1,
  Inside: 2,
  Start: 3,
  Whole: 4,
} as const;

// The CJK ideograph blocks (extension A, unified, compatibility).
const hanRun =
  /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+|[^\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+/g;
const hanOnly = /^[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+$/;
const anyHan = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const latinWordChar = /[a-z0-9]/;

/**
 * Text as it's compared: full-width letters, digits and punctuation from a
 * Chinese keyboard made their usual forms (NFKC), lowercase, and runs of
 * whitespace made one space.
 */
export const normalize = (text: string) =>
  text.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();

/** The words of a query, split at spaces and where Han text starts or ends. */
export const queryWords = (query: string) =>
  normalize(query)
    .split(' ')
    .flatMap(part => part.match(hanRun) ?? [])
    .map(word => word.trim())
    .filter(Boolean);

/** Whether `query` has a Han character. */
export const hasHan = (query: string) => anyHan.test(query);

interface PreparedField {
  texts: string[];
  tier: SearchTier;
  abbreviations: boolean;
}

/** Each item's normalized fields, kept while the item object lives. */
const prepared = new WeakMap<object, PreparedField[]>();

const prepare = <T extends object>(item: T, spec: SearchSpec<T>) => {
  let fields = prepared.get(item);
  if (!fields) {
    fields = spec.fields.map(({ get, tier, abbreviations }) => {
      const value = get(item);
      const values = Array.isArray(value) ? value : [value];
      return {
        texts: values.filter(text => !!text).map(text => normalize(text!)),
        tier,
        abbreviations: !!abbreviations,
      };
    });
    prepared.set(item, fields);
  }
  return fields;
};

/**
 * Whether `word` abbreviates `text`: it starts where the text starts and its
 * other characters follow in order (计网 for 计算机网络, 马原 for
 * 马克思主义基本原理). Only Han words of two to four characters count.
 */
const abbreviates = (word: string, text: string) => {
  if (word.length < 2 || word.length > 4 || text[0] !== word[0]) {
    return false;
  }
  let next = 1;
  for (let i = 1; i < text.length && next < word.length; i++) {
    if (text[i] === word[next]) {
      next++;
    }
  }
  return next === word.length;
};

/** How well `word` matches `text`, or 0. */
const matchKind = (word: string, text: string, abbreviations: boolean) => {
  if (text === word) {
    return Kind.Whole;
  }
  const at = text.indexOf(word);
  if (at === 0) {
    return Kind.Start;
  }
  if (at > 0) {
    // A Latin word matching from a word's start (`lab` in `final lab`) beats
    // one matching inside a word (`lab` in `syllabus`).
    if (latinWordChar.test(word[0])) {
      for (let i = at; i > 0; i = text.indexOf(word, i + 1)) {
        if (!latinWordChar.test(text[i - 1])) {
          return Kind.Start;
        }
      }
    }
    return Kind.Inside;
  }
  if (abbreviations && hanOnly.test(word) && abbreviates(word, text)) {
    return Kind.Abbreviation;
  }
  return 0;
};

/** The best score of `word` over the fields: tier × 10 + kind, or 0. */
const wordScore = (word: string, fields: PreparedField[]) => {
  let best = 0;
  for (const field of fields) {
    for (const text of field.texts) {
      const kind = matchKind(word, text, field.abbreviations);
      if (kind) {
        best = Math.max(best, field.tier * 10 + kind);
      }
    }
  }
  return best;
};

/**
 * The score of a Han word that no field holds whole, matched in pieces of two
 * or more characters that fields hold (the last piece may be one character,
 * as it's still being typed): the weakest piece's score less one, or 0.
 */
const piecesScore = (word: string, fields: PreparedField[]) => {
  if (!hanOnly.test(word) || word.length < 3) {
    return 0;
  }
  // best[i]: the best weakest-piece score covering word[0..i), 0 if none.
  const best = Array.from({ length: word.length + 1 }, () => 0);
  best[0] = Infinity;
  for (let start = 0; start < word.length; start++) {
    if (!best[start]) {
      continue;
    }
    for (let end = start + 1; end <= word.length; end++) {
      if (end - start < 2 && end < word.length) {
        continue;
      }
      if (end - start === word.length) {
        continue;
      }
      const score = wordScore(word.slice(start, end), fields);
      if (score) {
        best[end] = Math.max(best[end], Math.min(best[start], score));
      }
    }
  }
  const score = best[word.length];
  return score && score !== Infinity ? score - 1 : 0;
};

export interface SearchHit<T> {
  item: T;
  /** Higher is better; comparable across specs with the same tiers. */
  score: number;
}

/**
 * The items matching every word of `query` with their scores, best first;
 * items that rank the same keep their order in `items`. An empty query
 * matches nothing.
 */
export const searchHits = <T extends object>(
  items: readonly T[],
  query: string,
  spec: SearchSpec<T>,
  now: number,
): SearchHit<T>[] => {
  const words = queryWords(query);
  if (!words.length) {
    return [];
  }
  const scored: (SearchHit<T> & { attention: boolean })[] = [];
  for (const item of items) {
    const fields = prepare(item, spec);
    let score = 0;
    for (const word of words) {
      const best = wordScore(word, fields) || piecesScore(word, fields);
      if (!best) {
        score = 0;
        break;
      }
      score += best;
    }
    if (score) {
      scored.push({ item, score, attention: spec.attention(item, now) });
    }
  }
  return scored
    .sort(
      (a, b) => b.score - a.score || Number(b.attention) - Number(a.attention),
    )
    .map(({ item, score }) => ({ item, score }));
};

/** `searchHits` without the scores. */
export const searchItems = <T extends object>(
  items: readonly T[],
  query: string,
  spec: SearchSpec<T>,
  now: number,
): T[] => searchHits(items, query, spec, now).map(({ item }) => item);

/**
 * Where `words` (from `queryWords`) appear in `text`, as sorted, merged
 * `[start, end)` ranges. A Han word that the text doesn't hold whole is
 * looked for in pieces of two or more characters, longest first, as
 * `searchItems` matches it.
 */
export const matchRanges = (text: string, words: readonly string[]) => {
  const lower = text.toLowerCase();
  const ranges: [number, number][] = [];
  const addAll = (part: string) => {
    let found = false;
    for (
      let at = lower.indexOf(part);
      at >= 0;
      at = lower.indexOf(part, at + 1)
    ) {
      ranges.push([at, at + part.length]);
      found = true;
    }
    return found;
  };
  for (const word of words) {
    if (addAll(word) || !hanOnly.test(word)) {
      continue;
    }
    for (let start = 0; start < word.length - 1;) {
      let end = word.length;
      while (end - start >= 2 && !addAll(word.slice(start, end))) {
        end--;
      }
      start = end - start >= 2 ? end : start + 1;
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [start, end] of ranges) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }
  return merged;
};

/**
 * `text` cut to start a little before the first match of `words`, after an
 * ellipsis, when the match is past the first `shown` characters (about what
 * a card's two-line preview shows), so the card shows why it matched.
 */
export const snippet = (
  text: string,
  words: readonly string[],
  shown = 40,
  lead = 10,
) => {
  const first = matchRanges(text, words)[0];
  if (!first || first[0] < shown) {
    return text;
  }
  return `…${text.slice(first[0] - lead).trimStart()}`;
};
