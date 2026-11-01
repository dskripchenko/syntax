#!/usr/bin/env python3
"""Reports: f-strings with expressions, decorators, raw and byte strings."""
from dataclasses import dataclass
import re

PATTERN = re.compile(r"^(\d+)\s*-\s*(\w+)$")


@dataclass(frozen=True)
class Report:
    name: str
    rows: list[dict] = None

    def render(self, width: int = 80) -> str:
        title = f"{self.name!r:^{width}}"  # nested braces in the format spec
        total = sum(row.get("amount", 0) for row in self.rows or [])
        return f'{title}\nTotal: {total:,.2f} {{not a field}}' + b"\x00".decode()

    async def save(self, path):
        with open(path, "w") as f:
            f.write('''multi
line ''' + str(None) + str(True))
        return lambda x: x ** 2 if x is not None else ...
