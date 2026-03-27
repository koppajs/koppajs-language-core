# Document Parsing

## Evolution

- `evolution_phase`: stabilized-foundation
- `completeness_level`: high
- `known_gaps`: block tags are limited to alphanumeric names and embedded languages are not parsed into dedicated sub-ASTs
- `deferred_complexity`: nested grammar awareness beyond block pairing
- `technical_debt_items`: parser behavior is regex-driven and intentionally simple

## Description

Convert raw `.kpa` text into a deterministic `KpaDocument` containing source positions, block tags, and block ranges.

## Inputs

- raw `.kpa` document text as a single string

## Outputs

- `KpaDocument`
- `KpaTagToken[]`
- `KpaBlockNode[]`
- line-start offsets used for stable source-position mapping

## Behavior

1. Detect opening and closing block tags that match `[name]` and `[/name]`.
2. Record every detected tag with its source range.
3. Pair a closing tag only when it matches the most recently opened tag.
4. Keep unclosed opening tags as blocks that extend to end-of-file.
5. Classify canonical block kinds explicitly:
   - `template`
   - `ts`
   - `js`
   - `css`
   - `scss`
   - `sass`
   - compatibility aliases `html` and `tpl`
   - `unknown` for everything else
6. Sort resulting blocks by opening offset, then by end offset.

## Constraints

- Parsing is structural only. It does not validate TypeScript, HTML, or CSS content.
- Mismatched closing tags are not repaired by the parser; diagnostics are responsible for reporting them.
- Unknown block names are preserved instead of rejected.

## Edge Cases

- An unmatched closing tag still appears in `document.tags`.
- An unclosed canonical block remains available to later diagnostics.
- Compatibility aliases remain classified distinctly from the canonical `template` block.

## Acceptance Criteria

- Well-formed canonical blocks produce ordered tag and block lists.
- Mismatched closing tags do not erase the original open block.
- Offset-based block lookup returns the block that owns the current cursor context.
