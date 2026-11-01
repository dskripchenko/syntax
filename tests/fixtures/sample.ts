#!/usr/bin/env node
/**
 * An order service: types, generics, decorators, templates within templates.
 */
import { readFile } from 'node:fs/promises'

export interface Order<T extends object = {}> {
  id: string
  items: readonly T[]
  total?: number
}

@Injectable({ scope: 'request' })
export class OrderService implements Service {
  #cache = new Map<string, Order>()
  private readonly pattern = /^ord_[a-z0-9]{8}$/i

  async load(id: string): Promise<Order | undefined> {
    if (!this.pattern.test(id)) throw new TypeError(`bad id: ${id}`)
    const text = await readFile(`orders/${id}.json`, 'utf8')
    const ratio = text.length / 2 / 3 // a division, not a regex
    return { ...JSON.parse(text), note: `${ratio > 1 ? `big ${'order'}` : "small"}` } as Order
  }
}

const sizes = [0x1f, 1_000_000, 3.14e-2, .5, 10n]
type Keys = keyof typeof sizes satisfies unknown
