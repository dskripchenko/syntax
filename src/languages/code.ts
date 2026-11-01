/** Programming languages. */
import type { Grammar, Rule } from '../engine'
import {
  BLOCK_COMMENT,
  cLike,
  DQ,
  FUNCTION,
  IDENT,
  LINE_COMMENT,
  NUMBER,
  OPERATOR,
  PUNCT,
  SQ,
  startsExpression,
  TYPE_NAME,
  words,
  WS,
} from './common'

const REGEX: Rule = {
  match: /\/(?![*/])(?:\\.|\[(?:\\.|[^\]\\\n])*\]|[^/\\\n[])+\/[dgimsuyv]*/,
  token: 'regex',
  when: startsExpression,
}

/** JavaScript and TypeScript: one shape, TypeScript adds its words; template strings nest code in `${…}`. */
function ecma(extraKeywords: string, types: string): Grammar['states'] {
  const code = (close: Rule): Rule[] => [
    WS,
    LINE_COMMENT('//'),
    BLOCK_COMMENT,
    { match: /^#!.*/, token: 'meta' },
    { match: /`/, token: 'string', push: 'template' },
    DQ,
    SQ,
    REGEX,
    NUMBER,
    { match: words('true false null undefined NaN Infinity this super'), token: 'constant' },
    {
      match: words(
        `break case catch class const continue debugger default delete do else export extends finally for from function
         get if import in instanceof let new of return set static switch throw try typeof var void while with yield async await as ${extraKeywords}`,
      ),
      token: 'keyword',
    },
    ...(types ? [{ match: words(types), token: 'type' as const }] : []),
    { match: /@[A-Za-z_$][\w$.]*/, token: 'meta' },
    { match: /#[A-Za-z_$][\w$]*/, token: 'variable' },
    FUNCTION,
    TYPE_NAME,
    IDENT,
    { match: /\{/, token: 'punctuation', push: 'braces' },
    close,
    { match: /=>|\.\.\.|\?\?=?|\?\.|[+\-*/%=!<>&|^~?:]+/, token: 'operator' },
    PUNCT,
  ]
  return {
    root: code({ match: /\}/, token: 'punctuation' }),
    braces: code({ match: /\}/, token: 'punctuation', pop: 1 }),
    interp: code({ match: /\}/, token: 'punctuation', pop: 1 }),
    template: [
      { match: /`/, token: 'string', pop: 1 },
      { match: /\\[\s\S]/, token: 'escape' },
      { match: /\$\{/, token: 'punctuation', push: 'interp' },
      { match: /(?:[^`\\$]|\$(?!\{))+/, token: 'string' },
    ],
  }
}

export const javascript: Grammar = {
  id: 'javascript',
  name: 'JavaScript',
  aliases: ['js', 'jsx', 'mjs', 'cjs', 'node'],
  extensions: ['.js', '.mjs', '.cjs', '.jsx'],
  shebang: /\bnode\b/,
  states: ecma('', ''),
}

export const typescript: Grammar = {
  id: 'typescript',
  name: 'TypeScript',
  aliases: ['ts', 'tsx', 'mts', 'cts'],
  extensions: ['.ts', '.mts', '.cts', '.tsx'],
  states: ecma(
    'interface type enum namespace module declare abstract implements private protected public readonly keyof infer is asserts satisfies override accessor',
    'string number boolean bigint symbol any unknown never void object',
  ),
}

/** Python: f-strings hold expressions in `{…}`; decorators, triple quotes, prefixes. */
const pyCode = (close: Rule | null): Rule[] => [
  WS,
  LINE_COMMENT('#'),
  { match: /[rRbBuU]{0,2}("""|''')[\s\S]*?(?:\1|$(?![\s\S]))/, token: 'string' },
  { match: /[rR]?[fF][rR]?"/, token: 'string', push: 'fdq' },
  { match: /[rR]?[fF][rR]?'/, token: 'string', push: 'fsq' },
  { match: /[rRbBuU]{0,2}"(?:\\.|[^"\\\n])*"?/, token: 'string' },
  { match: /[rRbBuU]{0,2}'(?:\\.|[^'\\\n])*'?/, token: 'string' },
  { match: /^[ \t]*@[\w.]+/m, token: 'meta' },
  NUMBER,
  { match: words('True False None Ellipsis NotImplemented'), token: 'constant' },
  { match: words('self cls'), token: 'variable' },
  {
    match: words(
      'and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case type',
    ),
    token: 'keyword',
  },
  { match: words('int float str bool bytes list dict set tuple object frozenset complex bytearray'), token: 'type' },
  FUNCTION,
  TYPE_NAME,
  IDENT,
  ...(close ? [close] : []),
  { match: /\{/, token: 'punctuation', push: 'pyBraces' },
  { match: /->|:=|\*\*=?|\/\/=?|[+\-*/%=!<>&|^~@]=?/, token: 'operator' },
  PUNCT,
  { match: /:/, token: 'punctuation' },
]
const fstring = (quote: string): Rule[] => [
  { match: new RegExp(quote), token: 'string', pop: 1 },
  { match: /\{\{|\}\}/, token: 'escape' },
  { match: /\\./, token: 'escape' },
  { match: /\{/, token: 'punctuation', push: 'fexpr' },
  { match: /\n/, token: 'plain', pop: 1 },
  { match: new RegExp(`[^${quote}{}\\\\\\n]+`), token: 'string' },
]
export const python: Grammar = {
  id: 'python',
  name: 'Python',
  aliases: ['py', 'py3', 'python3'],
  extensions: ['.py', '.pyw', '.pyi'],
  shebang: /\bpython[\d.]*\b/,
  states: {
    root: pyCode(null),
    pyBraces: pyCode({ match: /\}/, token: 'punctuation', pop: 1 }),
    fexpr: pyCode({ match: /\}/, token: 'punctuation', pop: 1 }),
    fdq: fstring('"'),
    fsq: fstring("'"),
  },
}

export const go: Grammar = {
  id: 'go',
  name: 'Go',
  aliases: ['golang'],
  extensions: ['.go'],
  states: cLike({
    keywords: 'break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var',
    types: 'bool byte complex64 complex128 error float32 float64 int int8 int16 int32 int64 rune string uint uint8 uint16 uint32 uint64 uintptr any comparable',
    constants: 'true false nil iota',
    strings: [{ match: /`[^`]*`?/, token: 'string' }, DQ, { match: /'(?:\\.|[^'\\\n])+'/, token: 'string' }],
  }),
}

export const rust: Grammar = {
  id: 'rust',
  name: 'Rust',
  aliases: ['rs'],
  extensions: ['.rs'],
  states: cLike({
    keywords: 'as async await break const continue crate dyn else enum extern fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait type unsafe use where while',
    types: 'bool char str i8 i16 i32 i64 i128 isize u8 u16 u32 u64 u128 usize f32 f64 String Vec Option Result Box',
    constants: 'true false None Some Ok Err',
    extra: [
      { match: /#!?\[[^\]\n]*\]/, token: 'meta' },
      { match: /[A-Za-z_]\w*!(?=\s*[([{])/, token: 'function' },
    ],
    strings: [
      { match: /b?r(#*)"[\s\S]*?"\1/, token: 'string' },
      { match: /b?"(?:\\[\s\S]|[^"\\])*"?/, token: 'string' },
      { match: /b?'(?:\\(?:x[\da-fA-F]{2}|u\{[\da-fA-F]{1,6}\}|.)|[^'\\\n])'/, token: 'string' },
      { match: /'[A-Za-z_]\w*/, token: 'type' },
    ],
  }),
}

export const java: Grammar = {
  id: 'java',
  name: 'Java',
  extensions: ['.java'],
  states: cLike({
    keywords: 'abstract assert break case catch class const continue default do else enum extends final finally for goto if implements import instanceof interface native new package private protected public return static strictfp super switch synchronized this throw throws transient try var void volatile while record sealed permits yield',
    types: 'boolean byte char double float int long short',
    strings: [{ match: /"""[\s\S]*?(?:"""|$(?![\s\S]))/, token: 'string' }, DQ, { match: /'(?:\\.|[^'\\\n])+'/, token: 'string' }],
  }),
}

export const kotlin: Grammar = {
  id: 'kotlin',
  name: 'Kotlin',
  aliases: ['kt', 'kts'],
  extensions: ['.kt', '.kts'],
  states: cLike({
    keywords: 'as break class continue do else for fun if in interface is object package return super this throw try typealias typeof val var when while by catch constructor delegate dynamic field file finally get import init param property receiver set setparam where actual abstract annotation companion const crossinline data enum expect external final infix inline inner internal lateinit noinline open operator out override private protected public reified sealed suspend tailrec vararg',
    types: 'Int Long Short Byte Double Float Boolean Char String Unit Any Nothing',
    strings: [{ match: /"""[\s\S]*?(?:"""|$(?![\s\S]))/, token: 'string' }, DQ, { match: /'(?:\\.|[^'\\\n])+'/, token: 'string' }],
  }),
}

export const csharp: Grammar = {
  id: 'csharp',
  name: 'C#',
  aliases: ['cs', 'c#'],
  extensions: ['.cs', '.csx'],
  states: cLike({
    keywords: 'abstract as base break case catch checked class const continue default delegate do else enum event explicit extern finally fixed for foreach goto if implicit in interface internal is lock namespace new operator out override params private protected public readonly ref return sealed sizeof stackalloc static struct switch this throw try typeof unchecked unsafe using virtual volatile while var async await get set init record yield where when nameof',
    types: 'bool byte char decimal double float int long object sbyte short string uint ulong ushort void dynamic',
    preprocessor: true,
    strings: [
      { match: /\$?@"(?:""|[^"])*"?|@\$"(?:""|[^"])*"?/, token: 'string' },
      { match: /\$?"(?:\\.|[^"\\\n])*"?/, token: 'string' },
      { match: /'(?:\\.|[^'\\\n])+'/, token: 'string' },
    ],
  }),
}

export const swift: Grammar = {
  id: 'swift',
  name: 'Swift',
  extensions: ['.swift'],
  states: cLike({
    keywords: 'associatedtype class deinit enum extension fileprivate func import init inout internal let open operator private protocol public rethrows static struct subscript typealias var break case continue default defer do else fallthrough for guard if in repeat return switch where while as catch is super self Self throw throws try async await some any actor nonisolated',
    types: 'Int Double Float String Bool Character Array Dictionary Set Optional Void',
    constants: 'true false nil',
    strings: [{ match: /"""[\s\S]*?(?:"""|$(?![\s\S]))/, token: 'string' }, DQ],
  }),
}

export const c: Grammar = {
  id: 'c',
  name: 'C',
  aliases: ['h'],
  extensions: ['.c', '.h'],
  states: cLike({
    keywords: 'auto break case const continue default do else enum extern for goto if inline register restrict return sizeof static struct switch typedef union volatile while _Bool _Complex _Generic _Static_assert',
    types: 'char double float int long short signed unsigned void size_t int8_t int16_t int32_t int64_t uint8_t uint16_t uint32_t uint64_t bool',
    constants: 'true false NULL',
    preprocessor: true,
  }),
}

export const cpp: Grammar = {
  id: 'cpp',
  name: 'C++',
  aliases: ['c++', 'cc', 'hpp', 'cxx'],
  extensions: ['.cpp', '.cc', '.cxx', '.hpp', '.hh', '.hxx'],
  states: cLike({
    keywords: 'alignas alignof and asm auto break case catch class concept const consteval constexpr constinit const_cast continue co_await co_return co_yield decltype default delete do dynamic_cast else enum explicit export extern for friend goto if inline mutable namespace new noexcept not operator or private protected public register reinterpret_cast requires return sizeof static static_assert static_cast struct switch template this thread_local throw try typedef typeid typename union using virtual volatile while override final',
    types: 'bool char char8_t char16_t char32_t double float int long short signed unsigned void wchar_t size_t std string vector map',
    constants: 'true false nullptr NULL',
    preprocessor: true,
    strings: [{ match: /R"([^(\s]*)\([\s\S]*?\)\1"/, token: 'string' }, DQ, { match: /'(?:\\.|[^'\\\n])+'/, token: 'string' }],
  }),
}

const HEREDOC = /<<<\s*(['"]?)([A-Za-z_]\w*)\1\r?\n[\s\S]*?\r?\n[ \t]*\2\b/
const phpCode: Rule[] = [
  WS,
  { match: /\?>/, token: 'meta', pop: 1 },
  LINE_COMMENT('//'),
  { match: /#(?!\[).*/, token: 'comment' },
  BLOCK_COMMENT,
  { match: /#\[[^\]\n]*\]/, token: 'meta' },
  { match: HEREDOC, token: 'string' },
  DQ,
  SQ,
  { match: /\$[A-Za-z_]\w*/, token: 'variable' },
  NUMBER,
  { match: words('true false null TRUE FALSE NULL'), token: 'constant' },
  {
    match: words(
      'abstract and array as break callable case catch class clone const continue declare default do echo else elseif empty enddeclare endfor endforeach endif endswitch endwhile enum extends final finally fn for foreach function global goto if implements include include_once instanceof insteadof interface isset list match namespace new or print private protected public readonly require require_once return static switch throw trait try unset use var while xor yield',
      'i',
    ),
    token: 'keyword',
  },
  { match: words('int float string bool void mixed never iterable object self parent'), token: 'type' },
  FUNCTION,
  TYPE_NAME,
  IDENT,
  { match: /=>|->|::|\?->|[+\-*/%=!<>&|^~?:.]+/, token: 'operator' },
  PUNCT,
]
export const php: Grammar = {
  id: 'php',
  name: 'PHP',
  extensions: ['.php', '.phtml', '.php8'],
  shebang: /\bphp\b/,
  states: {
    root: [
      { match: /<\?(?:php\b|=)?/, token: 'meta', push: 'php' },
      // Around the code: the page's HTML.
      { match: /[\s\S]+?(?=<\?|$(?![\s\S]))/, embed: 'html' },
    ],
    php: phpCode,
  },
}

export const ruby: Grammar = {
  id: 'ruby',
  name: 'Ruby',
  aliases: ['rb'],
  extensions: ['.rb', '.rake', '.gemspec', '.ru'],
  filenames: ['Gemfile', 'Rakefile', 'Vagrantfile'],
  shebang: /\bruby\b/,
  states: {
    root: [
      WS,
      { match: /^=begin\b[\s\S]*?(?:^=end\b.*|$(?![\s\S]))/m, token: 'comment' },
      LINE_COMMENT('#'),
      { match: /<<[~-]?(['"]?)([A-Z_]\w*)\1[^\n]*\n[\s\S]*?\n[ \t]*\2\b/, token: 'string' },
      DQ,
      SQ,
      { match: /%[wWiIqQ]?([[({<])[\s\S]*?[\])}>]/, token: 'string' },
      { match: /:(?:[A-Za-z_]\w*[?!=]?|"[^"]*")/, token: 'constant' },
      { match: /@@?[A-Za-z_]\w*|\$[A-Za-z_]\w*/, token: 'variable' },
      REGEX,
      NUMBER,
      { match: words('true false nil self'), token: 'constant' },
      {
        match: words(
          'alias and begin break case class def defined do else elsif end ensure for if in module next not or redo rescue retry return super then undef unless until when while yield require require_relative attr_accessor attr_reader attr_writer private protected public include extend raise lambda proc',
        ),
        token: 'keyword',
      },
      { match: /[A-Za-z_]\w*[?!]?(?=\s*\()/, token: 'function' },
      TYPE_NAME,
      { match: /[A-Za-z_]\w*[?!]?/, token: 'plain' },
      OPERATOR,
      PUNCT,
    ],
  },
}

export const lua: Grammar = {
  id: 'lua',
  name: 'Lua',
  extensions: ['.lua'],
  shebang: /\blua\b/,
  states: {
    root: [
      WS,
      { match: /--\[(=*)\[[\s\S]*?\]\1\]/, token: 'comment' },
      LINE_COMMENT('--'),
      { match: /\[(=*)\[[\s\S]*?\]\1\]/, token: 'string' },
      DQ,
      SQ,
      NUMBER,
      { match: words('true false nil'), token: 'constant' },
      { match: words('and break do else elseif end for function goto if in local not or repeat return then until while self'), token: 'keyword' },
      FUNCTION,
      IDENT,
      { match: /\.\.\.?|[+\-*/%^#=~<>]+/, token: 'operator' },
      { match: /[{}()[\];,.:]/, token: 'punctuation' },
    ],
  },
}

export const bash: Grammar = {
  id: 'bash',
  name: 'Shell',
  aliases: ['sh', 'shell', 'zsh', 'console'],
  extensions: ['.sh', '.bash', '.zsh', '.ksh'],
  filenames: ['.bashrc', '.zshrc', '.profile', '.bash_profile'],
  shebang: /\b(?:ba|z|k|da)?sh\b/,
  states: {
    root: [
      WS,
      { match: /^#!.*/, token: 'meta' },
      { match: /(?<![\w$#{])#.*/, token: 'comment' },
      { match: /<<-?\s*(['"]?)([A-Za-z_]\w*)\1[^\n]*\n[\s\S]*?\n[ \t]*\2\b/, token: 'string' },
      { match: /"/, token: 'string', push: 'dq' },
      { match: /'[^']*'?/, token: 'string' },
      { match: /\$\{[^}\n]*\}?|\$\(\(?|\$[\w@#?$!*-]/, token: 'variable' },
      NUMBER,
      {
        match: words('if then else elif fi for while until do done case esac in function select return local export readonly declare typeset unset shift trap break continue time'),
        token: 'keyword',
      },
      {
        match: words('echo printf cd pwd exit set source alias read test eval exec kill wait sleep true false cat grep sed awk find xargs sort uniq head tail cut tr chmod chown mkdir rm cp mv ln ls curl git docker npm pnpm node make sudo'),
        token: 'function',
      },
      { match: /(?:^|(?<=\s))--?[A-Za-z][\w-]*/m, token: 'attribute' },
      { match: /[\w./~-]+/, token: 'plain' },
      { match: /&&|\|\||;;|[|&;<>!=]+/, token: 'operator' },
      { match: /[{}()[\]`]/, token: 'punctuation' },
    ],
    dq: [
      { match: /"/, token: 'string', pop: 1 },
      { match: /\\[\s\S]/, token: 'escape' },
      { match: /\$\{[^}\n]*\}?|\$[\w@#?$!*-]+/, token: 'variable' },
      { match: /[^"\\$]+|\$/, token: 'string' },
    ],
  },
}

export const powershell: Grammar = {
  id: 'powershell',
  name: 'PowerShell',
  aliases: ['ps', 'ps1', 'pwsh'],
  extensions: ['.ps1', '.psm1', '.psd1'],
  states: {
    root: [
      WS,
      { match: /<#[\s\S]*?(?:#>|$(?![\s\S]))/, token: 'comment' },
      LINE_COMMENT('#'),
      { match: /@"[\s\S]*?\n"@|@'[\s\S]*?\n'@/, token: 'string' },
      DQ,
      { match: /'(?:''|[^'])*'?/, token: 'string' },
      { match: /\$(?:\{[^}]*\}|[\w:]+)/, token: 'variable' },
      NUMBER,
      { match: words('true false null', 'i'), token: 'constant' },
      {
        match: words('begin break catch class continue data do dynamicparam else elseif end enum exit filter finally for foreach from function if in param process return switch throw trap try until using while', 'i'),
        token: 'keyword',
      },
      { match: /\b[A-Z][a-z]+-[A-Z][A-Za-z]+\b/, token: 'function' },
      { match: /-[A-Za-z][\w]*/, token: 'attribute' },
      { match: /\[[A-Za-z][\w.]*\]/, token: 'type' },
      IDENT,
      { match: /[+\-*/%=!<>&|]+/, token: 'operator' },
      { match: /[{}()[\];,.@]/, token: 'punctuation' },
    ],
  },
}

export const sql: Grammar = {
  id: 'sql',
  name: 'SQL',
  aliases: ['mysql', 'postgresql', 'postgres', 'sqlite', 'plsql'],
  extensions: ['.sql'],
  states: {
    root: [
      WS,
      LINE_COMMENT('--'),
      BLOCK_COMMENT,
      { match: /'(?:''|[^'])*'?/, token: 'string' },
      { match: /"(?:""|[^"])*"|`[^`]*`/, token: 'variable' },
      { match: /\$\d+|:[A-Za-z_]\w*|\?/, token: 'variable' },
      NUMBER,
      { match: words('true false null', 'i'), token: 'constant' },
      {
        match: words(
          `select from where and or not insert into values update set delete create alter drop table view index unique primary key foreign references
           join inner left right full outer cross on as group by order having limit offset union all distinct case when then else end is in like
           between exists returning with recursive begin commit rollback transaction grant revoke default constraint check cascade if replace
           trigger function procedure language returns declare asc desc nulls first last over partition window filter using lateral do nothing
           conflict sequence schema database extension column add rename to temporary temp materialized`,
          'i',
        ),
        token: 'keyword',
      },
      {
        match: words('int integer bigint smallint serial bigserial numeric decimal real float double precision varchar char text boolean bool date time timestamp timestamptz interval json jsonb uuid bytea blob', 'i'),
        token: 'type',
      },
      FUNCTION,
      IDENT,
      { match: /::|[<>=!]=?|\|\||[+\-*/%]/, token: 'operator' },
      { match: /[(),;.]/, token: 'punctuation' },
    ],
  },
}

export const CODE: Grammar[] = [javascript, typescript, python, go, rust, java, kotlin, csharp, swift, c, cpp, php, ruby, lua, bash, powershell, sql]
