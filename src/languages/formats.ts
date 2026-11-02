/** Data formats, markup, documents and the files around code. */
import type { Grammar, Rule } from '../engine'
import { BLOCK_COMMENT, DQ, IDENT, LINE_COMMENT, NUMBER, SQ, TYPE_NAME, words, WS } from './common'

export const json: Grammar = {
  id: 'json',
  name: 'JSON',
  aliases: ['geojson'],
  extensions: ['.json', '.geojson', '.webmanifest', '.har'],
  filenames: ['composer.lock'],
  states: {
    root: [
      WS,
      LINE_COMMENT('//'),
      BLOCK_COMMENT,
      { match: /"(?:\\.|[^"\\\n])*"(?=\s*:)/, token: 'property' },
      { match: /"(?:\\.|[^"\\\n])*"?/, token: 'string' },
      { match: /'(?:\\.|[^'\\\n])*'?/, token: 'string' },
      { match: /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|\b(?:Infinity|NaN)\b/, token: 'number' },
      { match: /\b(?:true|false|null)\b/, token: 'constant' },
      { match: /[A-Za-z_$][\w$]*(?=\s*:)/, token: 'property' },
      // A word that is not a key goes whole: never re-read from its next letter.
      { match: /[A-Za-z_$][\w$]*/, token: 'plain' },
      { match: /[{}[\],:]/, token: 'punctuation' },
    ],
  },
}

/** JSON with comments and trailing commas: tsconfig.json, VS Code's settings, `.jsonc`, JSON5. */
export const jsonc: Grammar = {
  id: 'jsonc',
  name: 'JSON with comments',
  aliases: ['json5'],
  extensions: ['.jsonc', '.json5'],
  filenames: ['tsconfig.json', 'jsconfig.json', '.babelrc', '.eslintrc', '.eslintrc.json', '.prettierrc', 'settings.json', 'launch.json', 'tasks.json', 'extensions.json', 'devcontainer.json', '.devcontainer.json', 'turbo.json', 'deno.json', 'deno.jsonc'],
  states: json.states,
}

/** JSON Lines: one value a line. */
export const jsonl: Grammar = {
  id: 'jsonl',
  name: 'JSON Lines',
  aliases: ['ndjson'],
  extensions: ['.jsonl', '.ndjson'],
  states: json.states,
}

export const yaml: Grammar = {
  id: 'yaml',
  name: 'YAML',
  aliases: ['yml'],
  extensions: ['.yaml', '.yml'],
  filenames: ['.clang-format', 'pnpm-lock.yaml'],
  states: {
    root: [
      { match: /^(?:---|\.\.\.)(?=\s|$)/m, token: 'meta' },
      WS,
      { match: /(?<![^\s])#.*/, token: 'comment' },
      { match: /^%.*/m, token: 'meta' },
      // A block scalar: its lines, more indented than the key, are text.
      { match: /([|>][+-]?\d*)([ \t]*(?:#.*)?)(\n(?:[ \t]*\n)*([ \t]+).*(?:\n(?:[ \t]*\n)*\4.*)*)/, groups: ['operator', 'comment', 'string'] },
      // A key: only where one can stand — a line's start (after its dashes), or in a flow mapping — so a long line is read once.
      { match: /(?<=^[ \t]*(?:[-?][ \t]+)*|[{,][ \t]*)(?:"(?:\\.|[^"\\\n])*"|'(?:''|[^'\n])*'|[^\s#'"[\]{},:-][^#\n:]*?|-[^\s#\n:]+?)(?=[ \t]*:(?:\s|$))/m, token: 'property' },
      { match: /"(?:\\.|[^"\\])*"?/, token: 'string' },
      { match: /'(?:''|[^'])*'?/, token: 'string' },
      { match: /[&*][^\s,[\]{}]+/, token: 'variable' },
      { match: /!!?[^\s,[\]{}]*/, token: 'meta' },
      { match: /(?<![^\s[{,:])(?:true|false|yes|no|on|off|null|~|True|False|Null|NULL|TRUE|FALSE)(?=\s*(?:$|[,\]}#]))/m, token: 'constant' },
      { match: /(?<![^\s[{,:])[-+]?(?:\.inf|\.nan|0x[\da-fA-F]+|0o[0-7]+|\d[\d_]*(?:\.\d*)?(?:[eE][+-]?\d+)?)(?=\s*(?:$|[,\]}#]))/m, token: 'number' },
      { match: /(?<![^\s[{,:])\d{4}-\d\d-\d\d(?:[Tt ]\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:?\d\d)?)?(?=\s*(?:$|[,\]}#]))/m, token: 'date' },
      { match: /[-?:](?=\s|$)|[[\]{},]/m, token: 'punctuation' },
      { match: /[^\s#,[\]{}]+/, token: 'string' },
    ],
  },
}

const TAG_NAME = /[A-Za-z][\w:.-]*/
const markup = (html: boolean): Grammar['states'] => ({
  root: [
    { match: /<!--[\s\S]*?(?:-->|$(?![\s\S]))/, token: 'comment' },
    { match: /<!\[CDATA\[[\s\S]*?(?:\]\]>|$(?![\s\S]))/, token: 'string' },
    { match: /<![A-Za-z][\s\S]*?>|<\?[\s\S]*?(?:\?>|$(?![\s\S]))/, token: 'meta' },
    ...(html
      ? [
          { match: /(<)(script)\b/i, groups: ['punctuation', 'tag'], push: 'scriptTag' } as Rule,
          { match: /(<)(style)\b/i, groups: ['punctuation', 'tag'], push: 'styleTag' } as Rule,
        ]
      : []),
    { match: new RegExp(`(</?)(${TAG_NAME.source})`), groups: ['punctuation', 'tag'], push: 'tag' },
    { match: /&(?:#\d+|#x[\da-fA-F]+|[A-Za-z][\w]*);/, token: 'escape' },
    { match: /[^<&]+/, token: 'plain' },
  ],
  tag: tagRules(null),
  scriptTag: tagRules('script'),
  styleTag: tagRules('style'),
  script: [{ match: /[\s\S]+?(?=<\/script\s*>|$(?![\s\S]))/i, embed: 'javascript', pop: 1 }],
  style: [{ match: /[\s\S]+?(?=<\/style\s*>|$(?![\s\S]))/i, embed: 'css', pop: 1 }],
})
function tagRules(then: 'script' | 'style' | null): Rule[] {
  return [
    WS,
    { match: /\/?>/, token: 'punctuation', pop: 1, ...(then ? { push: then } : {}) },
    { match: /[^\s=/>"']+(?=\s*=)/, token: 'attribute' },
    { match: /=/, token: 'operator' },
    DQ,
    SQ,
    { match: /[^\s=/>"']+/, token: 'attribute' },
  ]
}

export const xml: Grammar = {
  id: 'xml',
  name: 'XML',
  aliases: ['svg', 'xsl', 'xslt', 'plist', 'rss', 'atom', 'wsdl', 'xsd'],
  extensions: ['.xml', '.svg', '.xsl', '.xslt', '.xsd', '.wsdl', '.plist', '.rss', '.atom', '.csproj', '.fsproj', '.vcxproj', '.resx', '.xaml', '.pom', '.bpmn', '.dmn', '.drawio'],
  states: markup(false),
}

export const html: Grammar = {
  id: 'html',
  name: 'HTML',
  aliases: ['htm', 'xhtml', 'vue', 'svelte', 'markup'],
  extensions: ['.html', '.htm', '.xhtml', '.vue', '.svelte'],
  states: markup(true),
}

const cssValue: Rule[] = [
  WS,
  BLOCK_COMMENT,
  LINE_COMMENT('//(?![^\\n]*\\))'),
  DQ,
  SQ,
  { match: /#[\da-fA-F]{3,8}\b/, token: 'number' },
  { match: /-?(?:\d+\.?\d*|\.\d+)(?:%|[a-zA-Z]+)?/, token: 'number' },
  { match: /!important\b/, token: 'keyword' },
  { match: /[$@][\w-]+|--[\w-]+/, token: 'variable' },
  { match: /[\w-]+(?=\()/, token: 'function' },
  { match: /-*[A-Za-z][\w-]*/, token: 'constant' },
  // An operator in calc(): `100% - 2px`.
  { match: /-/, token: 'operator' },
]
export const css: Grammar = {
  id: 'css',
  name: 'CSS',
  aliases: ['scss', 'sass', 'less', 'postcss', 'stylus'],
  extensions: ['.css', '.scss', '.less', '.pcss'],
  states: {
    root: [
      WS,
      BLOCK_COMMENT,
      LINE_COMMENT('//'),
      { match: /@[\w-]+/, token: 'keyword' },
      DQ,
      SQ,
      { match: /\{/, token: 'punctuation', push: 'block' },
      { match: /[.#][\w-]+|&/, token: 'type' },
      { match: /::?[\w-]+/, token: 'attribute' },
      { match: /\[[^\]]*\]/, token: 'attribute' },
      { match: /[$@][\w-]+/, token: 'variable' },
      { match: /[A-Za-z][\w-]*/, token: 'tag' },
      { match: /[>+~,*()]/, token: 'operator' },
      { match: /[;:]/, token: 'punctuation' },
      ...cssValue,
    ],
    block: [
      WS,
      BLOCK_COMMENT,
      LINE_COMMENT('//'),
      { match: /\}/, token: 'punctuation', pop: 1 },
      { match: /--[\w-]+(?=\s*:)|[A-Za-z-][\w-]*(?=\s*:(?!:))/, token: 'property' },
      { match: /:/, token: 'punctuation', push: 'value' },
      { match: /@[\w-]+/, token: 'keyword' },
      { match: /\{/, token: 'punctuation', push: 'block' },
      { match: /[.#][\w-]+|&/, token: 'type' },
      { match: /::?[\w-]+/, token: 'attribute' },
      { match: /[A-Za-z][\w-]*/, token: 'tag' },
      { match: /[>+~,*();]/, token: 'punctuation' },
    ],
    value: [
      { match: /;/, token: 'punctuation', pop: 1 },
      { match: /(?=\})/, token: 'plain', pop: 1 },
      { match: /\{/, token: 'punctuation', next: 'block' },
      ...cssValue,
      { match: /[,/()+*]/, token: 'punctuation' },
    ],
  },
}

export const toml: Grammar = {
  id: 'toml',
  name: 'TOML',
  extensions: ['.toml'],
  filenames: ['Cargo.lock', 'Pipfile', 'poetry.lock'],
  states: {
    root: [
      WS,
      LINE_COMMENT('#'),
      { match: /^[ \t]*\[\[?[^\]\n]*\]\]?/m, token: 'type' },
      { match: /(?:[A-Za-z0-9_-]+|"(?:\\.|[^"\\\n])*"|'[^'\n]*')(?:\s*\.\s*(?:[A-Za-z0-9_-]+|"(?:\\.|[^"\\\n])*"|'[^'\n]*'))*(?=\s*=)/, token: 'property' },
      { match: /"""[\s\S]*?(?:"""|$(?![\s\S]))|'''[\s\S]*?(?:'''|$(?![\s\S]))/, token: 'string' },
      DQ,
      { match: /'[^'\n]*'?/, token: 'string' },
      { match: /\d{4}-\d\d-\d\d(?:[Tt ]\d\d:\d\d(?::\d\d(?:\.\d+)?)?(?:Z|[+-]\d\d:\d\d)?)?|\d\d:\d\d:\d\d(?:\.\d+)?/, token: 'date' },
      { match: /[+-]?(?:inf|nan)\b|[+-]?(?:0x[\da-fA-F_]+|0o[0-7_]+|0b[01_]+|\d[\d_]*(?:\.[\d_]+)?(?:[eE][+-]?\d+)?)/, token: 'number' },
      { match: /\b(?:true|false)\b/, token: 'constant' },
      { match: /[A-Za-z_][\w-]*/, token: 'plain' },
      { match: /=/, token: 'operator' },
      { match: /[[\]{},.]/, token: 'punctuation' },
    ],
  },
}

export const ini: Grammar = {
  id: 'ini',
  name: 'INI',
  aliases: ['cfg', 'conf', 'properties', 'editorconfig', 'gitconfig'],
  extensions: ['.ini', '.cfg', '.conf', '.properties', '.desktop', '.service', '.editorconfig', '.gitconfig', '.npmrc'],
  filenames: ['.editorconfig', '.gitconfig', '.npmrc', '.gitmodules', 'php.ini', 'my.cnf'],
  states: {
    root: [
      WS,
      { match: /^[ \t]*[;#!].*/m, token: 'comment' },
      { match: /^[ \t]*\[[^\]\n]*\]/m, token: 'type' },
      { match: /^([ \t]*)([^=:\s][^=:\n]*?)([ \t]*[=:])(.*)/m, groups: ['plain', 'property', 'operator', 'string'] },
    ],
  },
}

export const env: Grammar = {
  id: 'dotenv',
  name: '.env',
  aliases: ['env'],
  extensions: ['.env'],
  filenames: ['.env', '.env.example', '.env.local', '.env.development', '.env.production', '.env.test', '.env.testing'],
  states: {
    root: [
      WS,
      LINE_COMMENT('#'),
      { match: /^(?:export[ \t]+)?[A-Za-z_][\w.]*(?=[ \t]*=)/m, token: 'property' },
      { match: /=/, token: 'operator' },
      DQ,
      SQ,
      { match: /\$\{[^}\n]*\}|\$[A-Za-z_]\w*/, token: 'variable' },
      { match: /\b(?:true|false|null)\b/i, token: 'constant' },
      { match: /-?\d+(?:\.\d+)?\b/, token: 'number' },
      { match: /[^\s#$"']+/, token: 'string' },
    ],
  },
}

export const csv: Grammar = {
  id: 'csv',
  name: 'CSV',
  aliases: ['tsv'],
  extensions: ['.csv', '.tsv', '.tab'],
  states: {
    root: [
      { match: /"(?:""|[^"])*"?/, token: 'string' },
      { match: /[,;\t|]/, token: 'punctuation' },
      { match: /-?\d+(?:[.,]\d+)?(?:[eE][+-]?\d+)?(?=[,;\t|\r\n]|$)/, token: 'number' },
      { match: /\d{4}-\d\d-\d\d(?:[T ]\d\d:\d\d(?::\d\d)?)?/, token: 'date' },
      { match: /[^,;\t|"\n]+/, token: 'plain' },
    ],
  },
}

/** Markdown's inline markup: code, emphasis, links (nested: a badge is an image in a link), HTML, addresses. */
const mdInline: Rule[] = [
  { match: /<!--[\s\S]*?(?:-->|$(?![\s\S]))/, token: 'comment' },
  { match: /(`+)(?!`)[^\n]*?[^`\n]\1(?!`)|``(?!`)/, token: 'string' },
  { match: /(\*\*|__)(?=\S)(?:(?!\n\n)[^\n]|\n)*?\S\1/, token: 'strong' },
  { match: /(?<![\w*])(\*|_)(?=[^\s*_])(?:(?!\n\n)[^\n]|\n)*?[^\s\\]\1(?![\w*])/, token: 'emphasis' },
  { match: /~~(?=\S)[^\n]*?\S~~/, token: 'deleted' },
  // An internal link, as note-taking apps write it: [[note#heading|text]], ![[picture]].
  { match: /!?\[\[(?=[^\]\n]+\]\])/, token: 'punctuation', push: 'wiki' },
  // A footnote reference, then a link or an image: its label, then where it points.
  { match: /\[\^[^\]\n]+\]/, token: 'meta' },
  { match: /!?\[(?=[^\n]*\][([])/, token: 'punctuation', push: 'label' },
  { match: /<(?:https?|mailto|ftp):[^>\s]+>|<[\w.+-]+@[\w-]+\.[\w.-]+>/, token: 'link' },
  { match: /\b(?:https?|ftp):\/\/[^\s<>)\]]*[^\s<>)\].,;:!?'"]/, token: 'link' },
  { match: /<\/?[A-Za-z][\w-]*(?:\s[^<>]*)?\/?>/, embed: 'html' },
  { match: /\\[\\`*_{}[\]()#+\-.!|~<>]/, token: 'escape' },
  { match: /&(?:#\d+|#x[\da-fA-F]+|[A-Za-z][\w]*);/, token: 'escape' },
]

export const markdown: Grammar = {
  id: 'markdown',
  name: 'Markdown',
  aliases: ['md', 'mdx'],
  extensions: ['.md', '.markdown', '.mdown', '.mkd', '.mdx'],
  states: {
    root: [
      // Front matter at the very start: YAML between two `---` lines.
      { match: /^(---\n)([\s\S]*?\n)(---)(?=\n|$(?![\s\S]))/, groups: ['meta', { embed: 'yaml', token: 'string' }, 'meta'] },
      // A fenced block: its fences as meta, its body in the language the fence names.
      // A backtick fence's info has no backticks (CommonMark): ```` ```x ```` at a line's start is inline code.
      {
        match: /^ {0,3}(`{3,}(?=[^`\n]*\n)|~{3,})([^\n]*\n)([\s\S]*?)(^ {0,3}\1[ \t]*$|$(?![\s\S]))/m,
        groups: ['meta', 'meta', { embed: (m) => (m[2] ?? '').trim().split(/\s+/)[0]?.toLowerCase() || null, token: 'string' }, 'meta'],
      },
      { match: /^(#{1,6})([ \t].*|$)/m, groups: ['punctuation', 'heading'] },
      { match: /^.+\n(?:=+|-+)[ \t]*$/m, token: 'heading' },
      { match: /^[ \t]*(?:[-*_][ \t]*){3,}$/m, token: 'punctuation' },
      // A quote: its markers, then the quoted text in a colour of its own.
      { match: /^[ \t]*(?:>[ \t]?)+/m, token: 'punctuation', push: 'quote' },
      { match: /^([ \t]*(?:[-*+]|\d+[.)]))(?=[ \t])(?:([ \t]+)(\[[ xX]\]))?/m, groups: ['punctuation', 'plain', 'keyword'] },
      // A link's definition: `[label]: address "title"`.
      { match: /^([ \t]*)(\[[^\]\n]+\])(:)([ \t]*)(\S+)(.*)/m, groups: ['plain', 'variable', 'punctuation', 'plain', 'link', 'string'] },
      // A table's rule row, and the cells' bars.
      { match: /^[ \t]*\|?(?:[ \t]*:?-{3,}:?[ \t]*\|)+(?:[ \t]*:?-{3,}:?[ \t]*)?$/m, token: 'punctuation' },
      { match: /\|/, token: 'punctuation' },
      ...mdInline,
      { match: /[A-Za-z]+|[^\n`*_~[\]!<\\&|A-Za-z]+|[\s\S]/, token: 'plain' },
    ],
    quote: [
      { match: /\n/, token: 'plain', pop: 1 },
      ...mdInline,
      { match: /[A-Za-z]+|[^\n`*_~[\]!<\\&A-Za-z]+|[\s\S]/, token: 'comment' },
    ],
    // A link's text (where an image may sit, as in a badge), then its address or reference.
    label: [
      { match: /\](?=\()/, token: 'punctuation', next: 'target' },
      { match: /\](?=\[)/, token: 'punctuation', next: 'reference' },
      { match: /\]/, token: 'punctuation', pop: 1 },
      { match: /\n\n/, token: 'plain', pop: 1 },
      { match: /`[^`\n]*`/, token: 'string' },
      { match: /!?\[(?=[^\n]*\][([])/, token: 'punctuation', push: 'label' },
      { match: /\\[\][]/, token: 'escape' },
      { match: /[^\]![`\\\n]+|[\s\S]/, token: 'string' },
    ],
    target: [
      { match: /\(/, token: 'punctuation' },
      { match: /\)/, token: 'punctuation', pop: 1 },
      { match: /"[^"\n]*"|'[^'\n]*'/, token: 'string' },
      { match: /<[^>\n]*>|[^\s()]+(?:\([^\s()]*\)[^\s()]*)*/, token: 'link' },
      { match: /\n\n/, token: 'plain', pop: 1 },
      { match: /[ \t\n]+|[\s\S]/, token: 'plain' },
    ],
    wiki: [
      { match: /\]\]/, token: 'punctuation', pop: 1 },
      { match: /\|/, token: 'punctuation', next: 'wikiText' },
      { match: /#[^\]|\n]*/, token: 'variable' },
      { match: /[^\]|#\n]+|[\s\S]/, token: 'link' },
    ],
    wikiText: [
      { match: /\]\]/, token: 'punctuation', pop: 1 },
      { match: /[^\]\n]+|[\s\S]/, token: 'string' },
    ],
    reference: [
      { match: /\[/, token: 'punctuation' },
      { match: /\]/, token: 'punctuation', pop: 1 },
      { match: /\n/, token: 'plain', pop: 1 },
      { match: /[^\]\n]+/, token: 'variable' },
    ],
  },
}

export const diff: Grammar = {
  id: 'diff',
  name: 'Diff',
  aliases: ['patch', 'udiff'],
  extensions: ['.diff', '.patch'],
  states: {
    root: [
      { match: /^(?:diff |index |--- |\+\+\+ |new file|deleted file|similarity|rename |old mode|new mode).*/m, token: 'heading' },
      { match: /^@@.*?@@/m, token: 'meta' },
      { match: /^\+.*/m, token: 'inserted' },
      { match: /^-.*/m, token: 'deleted' },
      { match: /^\\.*/m, token: 'comment' },
      { match: /.*\n?|\n/, token: 'plain' },
    ],
  },
}

export const log: Grammar = {
  id: 'log',
  name: 'Log',
  aliases: ['logs'],
  extensions: ['.log', '.out', '.err'],
  states: {
    root: [
      // A stack trace's lines, before white space takes their indentation.
      { match: /^\s+at\s.*|^\s*#\d+\s.*|^\s*File ".*", line \d+.*/m, token: 'comment' },
      // A line break alone: the next line's indentation is still at its start (a stack trace's `at`).
      { match: /\n|[ \t]+/, token: 'plain' },
      { match: /\b\d{4}-\d\d-\d\d(?:[T ]\d\d:\d\d:\d\d(?:[.,]\d+)?(?:Z|[+-]\d\d:?\d\d)?)?|\b\d\d\/[A-Z][a-z]{2}\/\d{4}:\d\d:\d\d:\d\d(?: [+-]\d{4})?|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) +\d{1,2} \d\d:\d\d:\d\d|\b\d\d:\d\d:\d\d(?:[.,]\d+)?\b/, token: 'date' },
      { match: /\b(?:FATAL|CRITICAL|CRIT|ALERT|EMERG(?:ENCY)?|ERROR|ERR|SEVERE|PANIC)\b|\b\w+(?:Error|Exception)\b/, token: 'error' },
      { match: /\b(?:WARNING|WARN)\b/, token: 'warning' },
      { match: /\b(?:INFO|NOTICE)\b/, token: 'info' },
      { match: /\b(?:DEBUG|TRACE|VERBOSE)\b/, token: 'debug' },
      { match: /\b(?:https?|ftp|wss?):\/\/[^\s"'<>)]+/, token: 'link' },
      { match: /"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/, token: 'string' },
      { match: /[A-Za-z_][\w.-]*(?==)/, token: 'property' },
      { match: /\b(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?\b|\b0x[\da-fA-F]+\b|\b[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}\b|\b\d+(?:\.\d+)?(?:ms|s|m|h|KB|MB|GB|%)?\b/, token: 'number' },
      { match: /\b(?:true|false|null|nil|None)\b/, token: 'constant' },
      { match: /[A-Za-z_][\w.$-]*|[^\s\w]/, token: 'plain' },
    ],
  },
}

export const dockerfile: Grammar = {
  id: 'dockerfile',
  name: 'Dockerfile',
  aliases: ['docker', 'containerfile'],
  extensions: ['.dockerfile'],
  filenames: ['Dockerfile', 'Containerfile'],
  states: {
    root: [
      WS,
      { match: /^[ \t]*#.*/m, token: 'comment' },
      { match: /^[ \t]*(?:FROM|RUN|CMD|LABEL|MAINTAINER|EXPOSE|ENV|ADD|COPY|ENTRYPOINT|VOLUME|USER|WORKDIR|ARG|ONBUILD|STOPSIGNAL|HEALTHCHECK|SHELL)\b/im, token: 'keyword' },
      { match: /\b(?:AS|as)\b(?=\s+[\w.-]+\s*$)/m, token: 'keyword' },
      { match: /--[\w-]+(?:=\S*)?/, token: 'attribute' },
      DQ,
      SQ,
      { match: /\$\{[^}\n]*\}|\$[A-Za-z_]\w*/, token: 'variable' },
      NUMBER,
      { match: /\\$/m, token: 'punctuation' },
      { match: /&&|\|\||[|;=]/, token: 'operator' },
      { match: /[^\s"'$\\&|;=#-]+|[\s\S]/, token: 'plain' },
    ],
  },
}

export const makefile: Grammar = {
  id: 'makefile',
  name: 'Makefile',
  aliases: ['make', 'mk'],
  extensions: ['.mk', '.make'],
  filenames: ['Makefile', 'makefile', 'GNUmakefile'],
  states: {
    root: [
      { match: /^#.*|(?<=\s)#.*/m, token: 'comment' },
      { match: /^(?:include|-include|sinclude|ifeq|ifneq|ifdef|ifndef|else|endif|define|endef|export|unexport|override|vpath)\b/m, token: 'keyword' },
      { match: /^[A-Za-z0-9_.%/$() -]+?(?=\s*::?(?!=))/m, token: 'function' },
      { match: /^[A-Za-z_][\w.]*(?=\s*(?:[:?+!]?=))/m, token: 'property' },
      { match: /\$[({][^)}\n]*[)}]|\$[@<^+?*%$]/, token: 'variable' },
      DQ,
      SQ,
      { match: /[:?+!]?=|::?|\|/, token: 'operator' },
      { match: /[^\s#$"':=|]+|\s+|[\s\S]/, token: 'plain' },
    ],
  },
}

export const graphql: Grammar = {
  id: 'graphql',
  name: 'GraphQL',
  aliases: ['gql'],
  extensions: ['.graphql', '.gql', '.graphqls'],
  states: {
    root: [
      WS,
      LINE_COMMENT('#'),
      { match: /"""[\s\S]*?(?:"""|$(?![\s\S]))/, token: 'string' },
      DQ,
      { match: /\$[A-Za-z_]\w*/, token: 'variable' },
      { match: /@[A-Za-z_]\w*/, token: 'meta' },
      NUMBER,
      { match: words('true false null'), token: 'constant' },
      { match: words('query mutation subscription fragment on type input enum scalar interface union schema extend implements directive repeatable'), token: 'keyword' },
      TYPE_NAME,
      { match: /[A-Za-z_]\w*(?=\s*[:(])/, token: 'property' },
      IDENT,
      { match: /\.\.\.|[!=|&]/, token: 'operator' },
      { match: /[{}()[\]:,]/, token: 'punctuation' },
    ],
  },
}

export const protobuf: Grammar = {
  id: 'protobuf',
  name: 'Protocol Buffers',
  aliases: ['proto'],
  extensions: ['.proto'],
  states: {
    root: [
      WS,
      LINE_COMMENT('//'),
      BLOCK_COMMENT,
      DQ,
      SQ,
      NUMBER,
      { match: words('true false'), token: 'constant' },
      { match: words('syntax edition package import public weak option message enum service rpc returns stream oneof map reserved extensions extend optional required repeated to max'), token: 'keyword' },
      { match: words('double float int32 int64 uint32 uint64 sint32 sint64 fixed32 fixed64 sfixed32 sfixed64 bool string bytes'), token: 'type' },
      TYPE_NAME,
      IDENT,
      { match: /=/, token: 'operator' },
      { match: /[{}()[\];,.<>]/, token: 'punctuation' },
    ],
  },
}

export const http: Grammar = {
  id: 'http',
  name: 'HTTP',
  aliases: ['rest'],
  extensions: ['.http', '.rest'],
  states: {
    root: [
      LINE_COMMENT('#'),
      { match: /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|CONNECT|TRACE)([ \t]+)(\S+)/m, groups: ['keyword', 'plain', 'link'] },
      { match: /HTTP\/[\d.]+(?:[ \t]+\d{3}.*)?/, token: 'meta' },
      { match: /^([\w-]+)(:)[ \t]*(.*)/m, groups: ['property', 'punctuation', 'string'] },
      { match: /^\{[\s\S]*?^\}|^\[[\s\S]*?^\]/m, embed: 'json' },
      { match: /[\s\S]/, token: 'plain' },
    ],
  },
}

export const FORMATS: Grammar[] = [json, jsonc, jsonl, yaml, xml, html, css, toml, ini, env, csv, markdown, diff, log, dockerfile, makefile, graphql, protobuf, http]
