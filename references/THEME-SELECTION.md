# Theme and content-density selection

Use this reference before full visual implementation.

## Content-first mandatory gate

Read the complete narration, SRT and provided material before choosing a theme. Identify audience, emotional tone, story structure, evidence/data density, procedure screenshots and source-image availability. Match template structure to these properties rather than presenting a generic color gallery first.

Inspect existing theme/template libraries and any external references actually used. Record names, paths or verified source URLs and adaptation limits. A self-coined style name is not evidence that a template was found. Do not download or install templates or use external generation APIs without authorization.

Present five suitable directions unless another count is requested. For EACH direction, create comparable samples of the same actual opening, evidence/case page and procedural page, with identical content and asset roles. Explain why it fits, what it lacks and how screenshots remain readable. Show previews side by side; a color board or style name alone does not satisfy selection.

Obtain approval of a primary direction before building the full deck. A secondary direction may apply to selected scene types only; unify typography, palette, grid and motion. Do not impose two separate rounds of theme and layout approval. Use themes-gallery.html as an optional browsing aid. Existing explicit approval can be reused for local repairs but not assumed for a new project.

## Read themes dynamically

Inspect every `theme.json` under this package's own theme library:

```text
themes/
```

Enumerate them with `node scripts/list-themes.mjs`. If the user supplies their own theme library, pass that directory to the script instead. Match `nameZh`, `descriptionZh`, `mood`, `bestFor`, and `preview` against the complete available source, audience, and recording readability. Do not maintain a hardcoded theme list, and never write an absolute install path into a reference file.

## Design Read

Before previews, state:

- Presentation type
- Audience
- Tone
- Preferred aesthetic family

Then set and explain these three dials. Each is a working definition: state the number and what it buys, before drawing any preview.

| Dial | 1 | 5 | 10 |
|---|---|---|---|
| `DESIGN_VARIANCE` | One skeleton for the whole deck; only type size and content change | One grid, two or three page relationships chosen by content | Every page has a different layout relationship, still sharing one token set |
| `MOTION_INTENSITY` | Elements land only (opacity plus a short offset) | Elements arrive in sequence and one quantity is always advancing | Structural change inside the page, plus exactly one hero gesture for the whole film |
| `VISUAL_DENSITY` | One conclusion per page, at most three information blocks | Four to six blocks, including one relationship | Data, evidence and procedure carried on the same page, six to nine blocks |

Two hard rules for reading these numbers:

- Explain the number before setting it. A dial with no stated reason is the same as no dial.
- `MOTION_INTENSITY` above 5 does not license decorative motion. Every beat still has to carry a visible change, and every page needs one real anchor; see `references/MOTION-BASELINE.md` for the five criteria this package holds.

## Five-direction shortlist

Recommend exactly five visual directions unless the user explicitly requests another count. Each direction must include:

- Theme id and Chinese name
- Why it matches the content and audience
- Design signature
- Recording-readability strength
- Readability or repetition risk
- Best page relationships
- Author preview link when available

The five choices should be meaningfully distinct. Avoid five cosmetic variations of one layout.

## Same-content preview rule

Use the same real content, information quantity, semantic time point, and asset role in all five 1920 x 1080 previews. Each preview contains:

- Short title
- Concise explanation
- One process, comparison, or data relationship
- Completed beat state

Generate a final static state only. Do not wire the MP3 or build the full deck during selection.

## Text-density checkpoint

Ask the user to approve one:

- `rich`: conclusion plus explanatory details, process notes, data, or evidence on each applicable page
- `concise`: title, key phrase, and one visual relationship; narration carries most details
- `custom`: user-defined mixed rule

Do not silently infer this choice when the user is reviewing the combined checkpoint. If the user delegates the choice, recommend one based on viewing context and record the reason.

## Approval record

Write `visual-direction.md`:

```text
Approved theme id:
Theme name:
Light or dark:
DESIGN_VARIANCE:
MOTION_INTENSITY:
VISUAL_DENSITY:
Text density: rich | concise | custom
Custom density rule:
Preferred page relationships:
Provided asset usage:
Avoid list:
Approved preview:
Approval date:
```

Full visual implementation may start after this record is complete. Explicit choices in the user's request may populate the record directly.

## Theme and layout distinction

Theme tokens control color, typography, spacing character, rules, radii, number style, shadow, texture, and baseline mood. Layout remains content-driven. Keep one theme while choosing relationships from the narration and approved text density.
