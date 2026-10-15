---
name: fumadocs-source-examples
description: Add or reuse runnable source examples in this repository's Fumadocs pages through SourceRef and the shared Source Explorer drawer. Use when writing or updating any doc with full source/config, multi-file examples, source referenced from multiple sections/pages, or requests such as "thêm source cho doc", "reference code", "mở source trong drawer", or "rút gọn code trong bài". Combine with the relevant writing skill; do not impose the interview-question format on generic technical docs. Do not rebuild the viewer or embed VS Code/Monaco.
---

# Fumadocs Source Examples

Keep explanations in the article; store complete source in real files and reference it with `SourceRef`. Reuse the existing read-only drawer, file tree, snapshot selection, highlighting and deep links.

## Read the repository contract first

Read [the authoring guide](../../../docs/source-explorer.md) before adding or changing examples. Resolve that link relative to this skill directory; treat other project paths below as repository-root-relative.

Inspect `examples/registry.json` and the target article. For implementation details or new language support, inspect `scripts/build-source-examples.mjs` and `src/components/source-explorer/types.ts`. Treat these files as the source of truth; do not invent props or registry fields.

## Choose what belongs inline

- Keep short snippets, commands and the exact lines being explained next to the prose.
- Move complete configs/components, multi-file examples and repeated source into `examples/`.
- Keep a sentence explaining each reference's purpose. Do not hide the explanation itself inside the drawer or replace useful snippets with unexplained links.
- Reuse an existing project/snapshot when its source matches the article. Reference the same file/region from multiple sections or articles rather than copying it.
- Use the article's existing writing format. Do not add a source project to a purely conceptual article unless a runnable example helps or the user requests one.

## Workflow

1. **Find or create the example.** Store runnable files in `examples/<project>/<snapshot>/`. Provide all dependencies/config/files needed to run it; do not leave unexplained `...` placeholders in runnable source. State the working directory and run commands in the article.
2. **Separate stages.** Give materially different tutorial states their own independent snapshots, such as `basic` and `async-bootstrap`. Pin references to the appropriate snapshot; never silently replace earlier examples with the final state.
3. **Register source.** Update `examples/registry.json` with the project `id`, `title`, `defaultSnapshot` and snapshot entries containing `id`, `title`, `root`, `defaultFile`, `files`. Use stable IDs and an explicit file allowlist. Never publish secrets, `.env`, personal files, dependencies or unreviewed build output. For intentional output examples, follow the build-capture rules below.
4. **Mark meaningful regions.** Prefer stable named regions over line numbers for sections likely to move. Use unique names within a file; do not nest regions. For JS/TS/TSX, use the exact markers below. For other file formats, use whole-file references or `lines` unless the generator supports suitable valid markers.
5. **Write references.** Use static string props in MDX so build-time validation can check them. No component import is needed in this repository. Add a clearly labelled whole-project reference near the example's introduction, then focused file/region references where they are discussed.
6. **Verify.** Run the checks below. Report the article and example paths and what was actually verified.

## MDX patterns

Open an entire registered project using its default snapshot/file:

```mdx
<SourceRef project="webpack-react-demo" variant="button">
  Mở source đầy đủ của ví dụ
</SourceRef>
```

Reference a file or region inline, with an optional readable label:

```mdx
Webpack bắt đầu từ <SourceRef project="webpack-react-demo" file="webpack.config.cjs" region="entry">entry trong config</SourceRef>.
```

Pin a different tutorial stage:

```mdx
<SourceRef project="webpack-react-demo" snapshot="async-bootstrap" file="src/main.tsx">
  Xem entry sau khi tách bootstrap
</SourceRef>
```

Use `lines="12"` or `lines="12-18"` only when appropriate; never combine `lines` and `region`. Check that the range exists in the selected file/snapshot. Use `inline` (default) or `button` for `variant`; do not invent display modes. Use MDX for JSX references.

Named region in actual JS/TS/TSX source:

```js
// #region entry
entry: './src/main.tsx',
// #endregion entry
```

Markers remain in the real source but are removed from display and copied code. Calculate `lines` against the displayed source after marker removal, not raw Git line numbers.

## Existing behavior to preserve

- Let `SourceRef` register the article's source automatically. The floating **Source code** button opens the right-hand drawer; no per-article provider, custom launcher or modal is needed.
- Preserve the compact viewer styling. Do not add a large header, inline full-code dumps, editors or code execution merely to include a new example.
- Use the same `project`/`snapshot`/`file`/`region` identifiers wherever the same source is discussed. Use the viewer's Copy link when a shareable URL is needed; do not link readers to local absolute filesystem paths.
- Do not edit or commit generated `public/source-examples/` assets. Modify source/registry and regenerate them.
- Check supported extensions before promising a new language: the current generator supports TSX, TS, JS/CJS/MJS, Vue SFC, JSON (including `.map`), plain `.txt`, HTML and CSS. Extend both its language list and extension map only if the example needs it, then test the generated output.

## Show generated output when it helps explain the build

- Read the authoring guide's build-capture section. Keep output in a separately labelled snapshot, not mixed into a runnable source snapshot.
- For the existing Webpack example, run `npm run examples:webpack:build` to create reviewed captures from real temporary builds, then `npm run source:build`. Do not fabricate emitted code or regenerate captures automatically at every site build.
- Reference real artifacts with stable aliases, e.g. `snapshot="output-async-bootstrap" file="dist/main.js"`. In registry `files`, use `{ "path": "dist/main.js", "source": "artifacts/<actual-hashed-name>.js", "displayPath": "dist/<actual-hashed-name>.js" }`; keep the actual generated filename visible.
- Keep small raw artifacts byte-for-byte. Label readable runtime extractions and derived stats/map summaries explicitly; never pretend they are separate emitted files. Record transformations, including reconciling intermediate map hashes to final filenames.
- List large vendor bundles/maps in the build report instead of publishing megabytes of highlighted code. State when a capture is only a selected subset, not deployable output.
- Set snapshot `capture.sourceSnapshot` and `capture.report`; retain source checksums in the report. Refresh intentionally when the source changes; do not bypass stale-capture validation.

## Verification checklist

Run from the repository root:

```bash
npm run source:build
npm run build
```

- Fix unknown projects, snapshots, files, regions and invalid line ranges reported by the source build; do not disable validation.
- Run the example's own install/check/build commands in its directory or a temporary copy. The website build excludes `examples/`, so it does not prove that sample code runs. Do not claim a run/build check that was not performed.
- Open at least one project reference and one targeted region in the browser when available; confirm the right snapshot, file and highlighted lines. Check existing early-stage references when adding later snapshots.
- If modifying viewer behavior or generation logic rather than only article content, also run `npm run test:source` (install Playwright Chromium if needed).
- During development, rerun `npm run source:build` after changing examples/registry and reload. npm dev/build hooks already generate assets on startup/build.
