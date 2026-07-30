---
name: fumadocs-interview-question-writer
description: Use this skill when the user wants to write a single interview-question deep-dive page for a technical interview-prep docs site — the format seen on sites like interview-question.pages.dev. Trigger on requests like "viết 1 bài câu hỏi phỏng vấn về X", "tạo interview question doc cho Y", "viết bài kiểu senior interview về Z", or when the user references that exact site's format (question in a blockquote, level tags, sample spoken answer, deep technical breakdown with scenarios, common traps as ❌/✅ pairs, follow-up questions, related links). Do NOT use this for generic technical explainers, architecture docs, or API docs — use fumadocs-technical-writer for those. Use fumadocs-project-init first if there's no project/folder structure yet for the interview-question collection.
---

# Fumadocs Interview-Question Writer

Write a single technical interview-question page in the deep-dive style used by sites like interview-question.pages.dev: a realistic interview question, framed for a target seniority level, followed by a sample spoken answer and then a much deeper technical breakdown — scenarios, root causes, code, decision tables, common wrong answers, and follow-up questions. This is richer than a flashcard Q&A: each page reads like a mini technical article anchored around one interview question.

## Relationship to the other Fumadocs skills

- **`fumadocs-project-init`** — run first if the project/folder doesn't exist yet. It already knows an "Interview questions" collection uses categories-by-subtopic rather than a foundations→production arc; this skill fills in one page within that structure.
- **`fumadocs-technical-writer`** — general-purpose doc writing (architecture, API, runbook). Its readability rules (jargon-glossing, one-idea-per-sentence, example-before-abstraction, hedge-with-a-landing) **apply here too** — see the "Readability" section below, which restates them in this format's context.
- This skill is specifically about the **interview-question page shape** — the section-by-section structure below.

## Research trước khi viết (bắt buộc cho câu hỏi tình huống thực tế)

Trước khi viết nội dung cho câu hỏi dạng **incident / system design / behavioral**, dùng `web_search` để tìm engineering blog hoặc post-mortem thực tế (Netflix, Uber, Cloudflare, Google SRE, AWS, và các công ty khác có blog kỹ thuật công khai) liên quan đến tình huống đang viết. Mục tiêu: câu trả lời phản ánh cách hệ thống thật từng thất bại và được xử lý, không phải suy diễn lý thuyết thuần túy.

- Áp dụng cho: incident/outage scenarios, system design trade-offs, behavioral/leadership situations gắn với vận hành hệ thống.
- Không bắt buộc cho câu hỏi thuần concept/định nghĩa (ví dụ "Heap vs Off-heap là gì") trừ khi bạn muốn dùng một production scenario thật làm hook mở đầu (xem bảng bên dưới) — khi đó vẫn nên search để hook đó có căn cứ thay vì bịa ra một con số/tình huống nghe hợp lý.
- Việc search không cần trích dẫn lộ liễu trong bài — dùng để đảm bảo chi tiết (con số, nguyên nhân, cách xử lý) khớp với thực tế đã từng xảy ra, rồi viết lại bằng lời của mình theo đúng conventions copyright (paraphrase, không quote nguyên văn).

## Loại câu hỏi và cách tiếp cận

Không phải mọi câu hỏi đều nên viết theo cùng một khuôn — "Câu trả lời mẫu" nên mở đầu khác nhau và "Phân tích chi tiết" nên có nhịp khác nhau tùy loại câu hỏi:

| Loại | Câu trả lời mẫu mở bằng | Phân tích chi tiết |
| --- | --- | --- |
| **Behavioral / Incident** | Mindset trước, action sau — ví dụ: "Việc đầu tiên tôi làm không phải là mở terminal..." | Timeline → các nhánh scenario (theo shape Nhận diện→Nguyên nhân→Mitigate→Fix) → commands → cách communicate |
| **Knowledge / Concept** | Một production scenario ngắn làm hook — ví dụ: "Tuần trước một pod bị kill dù heap chỉ dùng 40%..." | Nêu vấn đề thực tế trước → giải thích lý thuyết qua lăng kính debug (không mở bằng định nghĩa khô khan) → code minh họa |
| **System Design** | Systematic thinking — ví dụ: "Tôi sẽ không đoán nguyên nhân mà bắt đầu bằng đo lường..." | Đo lường → xác định bottleneck → giải quyết đúng tầng (không giải quyết sai lớp) → cách theo dõi/monitor sau khi fix |
| **So sánh (A vs B)** | Use case thực tế của một đội/dự án cụ thể — ví dụ: "Chúng tôi chọn X vì dự án cần..." | Use case cụ thể trước → bảng so sánh → trường hợp đối thủ (B) thực sự thắng → khía cạnh licensing/vận hành |

Xác định loại câu hỏi trước khi viết "Câu trả lời mẫu" (bước 5) và "Phân tích chi tiết" (bước 6), rồi áp dụng đúng cột tương ứng — đừng mặc định luôn theo khuôn Behavioral/Incident cho mọi loại câu hỏi.

## Required page structure

Every page follows this section order. Read `references/worked-example.md` for a complete, fully-written original example before producing your own — matching structure exactly matters more than matching wording.

### 1. Frontmatter
```mdx
---
title: <The scenario, as a short headline — not literally "Question about X">
description: <One-sentence summary of what this page tests/covers>
---
```
Good titles read like real interview framing or a vivid scenario ("2h sáng — server production sập"), not a dry topic label ("Về production incident"). Pick something a candidate would actually be asked or that sets a concrete scene.

### 2. `## Câu hỏi`
The literal question, in a blockquote, bolded — written exactly as an interviewer might ask it, including any scenario framing:
```mdx
> **2h sáng. Server production sập. 10,000 users đang online. Bạn làm gì NGAY LẬP TỨC?**
```
One question (or one tight scenario prompt) per page — don't bundle multiple unrelated questions here.

### 3. `## Dành cho level`
Tag which seniority level(s) this targets (Mid / Senior / Staff — adapt labels to the domain if needed), then explain in 2-4 sentences what's actually expected at that level (not what's *nice to know* — what's the bar). Close with a short "Điểm cộng" (bonus signals) line: what separates a good answer from a great one.

**If the page tags more than one level, the depth must actually differ per level — don't tag Mid/Senior/Staff and then write only one depth of content.** Concretely:
- Mid/Senior expectations live in the main "Phân tích chi tiết" walkthrough as usual.
- Add a short, clearly-marked "Góc nhìn Staff" (or similar) callout/subsection near the end of "Phân tích chi tiết" covering what a Staff-level answer adds on top — typically organizational/systemic angles the lower levels aren't expected to raise: cost of the incident/issue in business terms, whether this reveals a process gap (not just a code gap), what should change team-wide so this class of problem doesn't recur, how to prioritize the fix against other work.
- If truly every level answers at the same depth for this particular question, say so explicitly in one sentence rather than silently tagging multiple levels — a reader shouldn't have to guess whether the depth split was intentional or missed.

### 4. `## Cốt lõi cần nhớ`
2-4 short, **bolded lead-in** takeaways — each one sentence of bold claim, then (if needed) one short plain sentence of why. This is the section a rushed reader stops at. Don't turn this into a wall of text — if a point needs more than 2 sentences, that belongs in "Phân tích chi tiết," not here.

### 5. `## Câu trả lời mẫu`
A realistic **first-person spoken answer**, in a blockquote, written the way a strong candidate would actually talk in an interview — natural spoken cadence, not a bullet list read aloud. Open according to the question type — see "Loại câu hỏi và cách tiếp cận" above for the right opening move per type (mindset-first for incidents, a production-scenario hook for concept questions, systematic-thinking framing for system design, a team's real use case for A-vs-B comparisons). This models *how to answer out loud*, which is different from the technical deep-dive that follows.

### 6. `## Phân tích chi tiết`
The deep technical core — this is where most of the page's length lives. Structure it with `###` subsections as the content needs (overview, tech stack/context if relevant, phases/timeline, numbered scenarios, decision tables). The overall shape of this section follows the question type per "Loại câu hỏi và cách tiếp cận" above (timeline+scenarios for incidents; problem-first-then-theory for concept questions; measure→bottleneck→fix for system design; use-case→comparison table for A-vs-B). Within whichever shape applies, follow this ordering and formatting discipline:

- **Put any symptom→cause lookup/decision table early, right after the triage/diagnosis step and before the per-scenario deep dives — not at the end.** A reader debugging in real time wants to know *which* scenario to jump to before reading all of them in full; a "which of these am I looking at" table buried after every scenario has already been explained defeats its own purpose. If the doc has both a short triage table and a longer decision/comparison table, the short triage one goes early and a fuller comparison table can still go later if it serves a different purpose (e.g. summarizing all scenarios after they've been read).
- **Diagram any timeline or decision-tree structure instead of describing it in prose only.** If the content has a "phase 1 → phase 2 → phase 3" timeline, or a "check X, if yes go here, if no go there" branching triage flow, that's a Mermaid `flowchart`/`sequenceDiagram` candidate — don't rely on numbered `###` headings alone to carry a structure that's inherently a diagram. See `fumadocs-technical-writer`'s Mermaid-vs-ASCII guidance for the same decision criteria; it applies unchanged here.
- **Every code/command/config block must have a language tag** (` ```bash `, ` ```sql `, ` ```yaml `, ` ```properties `, ` ```java `, etc.) — never a bare ` ``` ` fence for anything that has a real language, both for syntax highlighting and because Fumadocs' code-block copy button/toolbar reads better with a tag. Use ` ```text ` only for genuine plain text (log output, generic diagrams) that isn't any specific language.
- **Link to related pages inline, at the exact point they're relevant — not only gathered in "Xem thêm" at the end.** If a scenario touches a concept covered in depth on another page (e.g. a Redis eviction scenario mentioning a caching-strategy page), drop the link right there as part of the sentence, in addition to (not instead of) listing it again in "Xem thêm" for the reader who wants a summary at the end.
- Use alert-style blockquotes for anything the reader must not miss — see "Alert syntax" below.
- Every scenario/branch should follow the same shape so the doc is scannable: **Nhận diện** (how to recognize it) → **Nguyên nhân phổ biến** (common causes) → **Mitigate ngay** (immediate fix) → **Fix đúng** (the real fix). Reuse this 4-part shape for any "several possible causes, each needing triage" topic (incidents, bugs, performance issues) — it's what makes this section scannable instead of a wall of prose.

### 7. `## Bẫy thường gặp`
Common wrong answers, each as a ❌/✅ pair, separated by a horizontal rule (`---`) between pairs:
```mdx
❌ **"<the wrong instinct, in the candidate's own words>"** → Tại sao sai: <why it's wrong, one sentence, concrete consequence not just "it's not best practice">
✅ Đúng hơn: <what a strong answer does instead>
```
3-5 traps is a good range — pick the ones a real candidate is actually likely to say, not strawmen.

### 8. `## Câu hỏi follow-up`
Numbered `###` sub-headings, each a realistic interviewer follow-up question, answered directly and concretely in the paragraph beneath — these are the "what if you push further" questions a good interviewer asks after the main answer. 3-5 is typical.

### 9. `## Xem thêm`
Bullet list linking to related pages in the collection, each with a one-clause note on *why* it's related (not just a bare link):
```mdx
- [Related page title](/path) — <why this connects to the current page's scenario>
```
This is a **summary/recap** of links for a reader skimming at the end — it should repeat (not replace) the inline links already dropped at the relevant point inside "Phân tích chi tiết" per the rule above.

## Fumadocs components to use in this format

This site is built on Next.js + Fumadocs, so lean on its built-in components instead of writing everything as plain markdown. Read `references/fumadocs-components-for-interview-docs.md` for exact import/JSX syntax; short version of what applies to this page shape:
- **`<Callout>`** — the JSX alternative to GFM alerts (see "Alert syntax" below); use for anything in "Phân tích chi tiết" the reader must not skip.
- **`<Cards>`** — a richer alternative to a plain bullet list for "Xem thêm" when the project has it configured; falls back to plain links if not.
- **`<Accordion>`** — optional: if "Câu hỏi follow-up" grows long (6+ questions), consider collapsing less-common follow-ups into an accordion so the main flow doesn't get overwhelming — but plain `###` headings are the safe default and fine for the typical 3-5.
- **`<Steps>`** — optional: for a literal ordered checklist section (like an incident checklist), `<Steps>` can replace a plain checkbox list when the project has it configured and the steps benefit from being visually separated.
- Mermaid code blocks — for any timeline/decision-tree content, per the diagram rule above.

## Alert syntax: GitHub-style vs Fumadocs `<Callout>`

The reference site uses native GFM alert blockquotes (`> [!IMPORTANT]`, `> [!TIP]`, `> [!WARNING]`) rather than the JSX `<Callout>` component. Both work, pick based on the project:
- **If the project's `next.config`/`source.config` already enables GFM alerts** (via a remark plugin) — use `> [!IMPORTANT]` / `> [!TIP]` / `> [!WARNING]` / `> [!NOTE]` / `> [!CAUTION]` blockquotes. This reads closer to plain GitHub markdown and is what the reference site does.
- **If unsure or the project uses vanilla `fumadocs-mdx` defaults** — use `<Callout type="warn">`/`<Callout type="info">` etc. (see `fumadocs-technical-writer`'s component reference) since that's guaranteed to work without extra remark config.
- Don't mix both styles within the same doc — pick one and use it consistently across the page.

## Readability (same rules as fumadocs-technical-writer, applied to this format)

There is no length cap and no target length for this format — a page like this is naturally long (question, level framing, sample answer, multi-scenario deep-dive, traps, follow-ups), and that's fine. Never cut a scenario short, skip a cause, or compress an explanation just to keep the page "shorter." The only thing that matters is that every section stays easy to follow — long-and-clear beats short-and-dense every time here.

This format's biggest failure mode observed in the wild: the "Phân tích chi tiết" section turning into dense, jargon-stacked prose that's technically correct but exhausting to read (see `fumadocs-technical-writer`'s readability section for the full rationale). Apply the same rules here, and they matter *more* in this format because it mixes code with prose:
- Gloss any acronym/term on first use in a scenario (don't assume the reader already knows what every metric/flag means).
- One idea per sentence, especially in "Nguyên nhân phổ biến" bullets — each bullet should be one cause, not a chain of three.
- Put the command/code/log line immediately next to the sentence that explains it — never explain for several sentences before showing what you mean.
- Every "Fix đúng" and "Mitigate ngay" block should end with a plain takeaway, not trail off in caveats.
- Keep "Cốt lõi cần nhớ" and "Câu trả lời mẫu" especially conversational and jargon-light — those are the sections a nervous reader leans on most; save density for "Phân tích chi tiết".
- More scenarios, more follow-up questions, more traps, an extra worked example — all welcome if they genuinely help the reader, never trimmed just to shorten the page. The only acceptable cut is genuine redundancy (restating the same point twice) or content irrelevant to the question at hand.
