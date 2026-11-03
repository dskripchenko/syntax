import { describe, expect, it } from 'vitest'
import { flattenSymbols, symbolPath, symbols } from '../src'
import { sample } from './helpers'

/** `kind name line-end`, indented by depth. */
const outline = (code: string, language: string) =>
  flattenSymbols(symbols(code, language)).map((s) => `${'  '.repeat(s.container ? s.container.split('.').length : 0)}${s.kind} ${s.name} ${s.line}-${s.endLine}`)

describe('the symbols of a text', () => {
  it('TypeScript: classes with their methods and properties, interfaces, types, functions, constants', () => {
    const code = [
      'export interface Order {',
      '  id: string',
      '}',
      'export const LIMIT = 10',
      'export class Service {',
      '  private cache = new Map()',
      '  constructor(private api: Api) {}',
      '  async load(id: string): Promise<Order> {',
      '    if (this.cache.has(id)) { return this.cache.get(id) }',
      '    const inner = () => 1',
      '    return this.api.get(id)',
      '  }',
      '  get size(): number {',
      '    return this.cache.size',
      '  }',
      '}',
      'export type Keys = keyof Order',
      'export const toId = (o: Order) => o.id',
      'function helper() {',
      '  // function notThis() {}',
      '  const s = "class NotThis {}"',
      '}',
    ].join('\n')
    expect(outline(code, 'typescript')).toEqual([
      'interface Order 1-3',
      '  property id 2-2',
      'constant LIMIT 4-4',
      'class Service 5-16',
      '  property cache 6-6',
      '  constructor constructor 7-7',
      '  method load 8-12',
      '    function inner 10-10',
      '  method size 13-15',
      'type Keys 17-17',
      'function toId 18-18',
      'function helper 19-22',
    ])
  })

  it('Python by indentation: methods in classes, a constructor, top-level constants', () => {
    const code = ['MAX = 3', '', 'class Repo:', '    def __init__(self):', '        self.items = []', '', '    async def fetch(self, id):', '        return id', '', 'def main():', '    pass', ''].join('\n')
    expect(outline(code, 'python')).toEqual(['constant MAX 1-1', 'class Repo 3-8', '  constructor __init__ 4-5', '  method fetch 7-8', 'function main 10-11'])
  })

  it('Go, Rust, PHP, Ruby, C#, Kotlin, Swift, C++ samples', () => {
    expect(outline(sample('sample.go'), 'go')).toEqual(['interface Shape 9-11', 'struct Rect 13-13', 'method Area 15-15', 'function main 17-25'])
    expect(outline(sample('sample.rs'), 'rust')).toContain('function count 22-28')
    expect(outline(sample('sample.php'), 'php')).toEqual(['namespace App\\Http 6-6', 'class OrderController 11-21', '  method show 13-20'])
    expect(outline(sample('sample.rb'), 'ruby')).toEqual(['module Shop 7-22', '  class Order 8-21', '    constructor initialize 11-14', '    method total? 16-18', '    method to_s 20-20'])
    expect(outline(sample('sample.cs'), 'csharp')).toEqual(['namespace Shop 4-22', '  class Price 7-11', '    method ToString 9-9', '  class Program 13-21', '    method Main 15-20'])
    expect(outline(sample('sample.kt'), 'kotlin')).toEqual(['namespace app 1-1', 'class User 3-3', 'function greet 5-14'])
    expect(outline(sample('sample.swift'), 'swift')).toEqual(['struct Point 3-11', '  method distance 7-10'])
    expect(outline(sample('sample.cpp'), 'cpp')).toEqual(['namespace shop 4-13', '  class Cart 6-12', '    method add 8-8', 'function main 15-20'])
  })

  it('documents and configs: headings, keys, sections, selectors, targets, stages', () => {
    expect(outline('# A\ntext\n## B\n```\n# not a heading\n```\n### C\n# D\n', 'markdown')).toEqual(['heading A 1-7', '  heading B 3-7', '    heading C 7-7', 'heading D 8-8'])
    expect(outline('{\n  "a": { "b": 1, "c": [1, 2] },\n  "d": {\n    "e": true\n  }\n}\n', 'json')).toEqual(['key a 2-2', '  key b 2-2', '  key c 2-2', 'key d 3-5', '  key e 4-4'])
    expect(outline('server:\n  host: x\n  port: 1\nlog: info\n', 'yaml')).toEqual(['key server 1-3', '  key host 2-2', '  key port 3-3', 'key log 4-4'])
    expect(outline(sample('sample.css'), 'css')).toEqual(['selector :root 2-2', 'selector .card > .title:hover, #main a[href^="http"]::after 3-8', 'namespace @media (max-width: 600px) 9-11', '  selector .card 10-10'])
    expect(outline(sample('Makefile'), 'makefile').map((s) => s.split(' ')[1])).toEqual(['.PHONY', 'all', 'app', 'clean'])
    expect(outline('[server]\nport = 1\n[[bin]]\n', 'toml')).toEqual(['section server 1-1', 'section bin 3-3'])
    expect(outline('FROM node:22 AS build\nRUN x\nFROM nginx\n', 'dockerfile')).toEqual(['module build 1-1', 'module nginx 3-3'])
    expect(outline('CREATE TABLE IF NOT EXISTS orders (id int);\ncreate or replace function total() returns int as $$ select 1 $$;\n', 'sql')).toEqual(['table orders 1-1', 'function total 2-2'])
    expect(symbols('anything', 'no-such-language')).toEqual([])
  })

  it('the path to a line: the symbols holding it, outermost first', () => {
    const tree = symbols(sample('sample.cs'), 'csharp')
    expect(symbolPath(tree, 17).map((s) => s.name)).toEqual(['Shop', 'Program', 'Main'])
    expect(symbolPath(tree, 1)).toEqual([])
  })
})
