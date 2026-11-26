# Slate rules

Files: `src/app/190-rules.js` (the page, the Add sheet, a page per rule, Back), `src/app/180-worth-a-look.js` (rule
wording `optInfo`/`optShort`/`optPhrase`, `rulesSentence`, `lgOptRows` = a league's choices, `eventPicker`, `setLg`),
`src/app/165-events.js` (golf and F1 options `EV_RULES`, `setEvRule`), `src/styles/104-slate-rules.css`.
Saved rules: `state.rules` (`normRules` in 050-slate-engine.js). The page never changes how rules are stored.

## Layout (3.136.0, DJ Nov 26, 2026)
DJ found "Every league" / "By league" confusing and couldn't tell his current rules from editing or adding.
He picked layout A from three concepts (https://claude.ai/artifact/JpT2cMpLqNEGUZ97q8My1n).
- Main page: the summary card (count + `rulesSentence`), Suggested rules, **Your rules** (only rules that are on, one
  `.rl-row` each: icon, name, plain summary, tonight's count, chevron), a dashed **Add a rule** button, **Limits**
  (Starts after, Most games as two boxes).
- Rule ids: `favorites`, `events`, `lg:<league>`, `ev:<golf|wgolf|f1>`. `rlInfo(id)` says on / summary / count.
- Tapping a row sets `state.rulesEdit = id`: the rule's own page (header with icon and "Picks N tonight", its choices,
  Remove this rule with `topUndo`, Done). Leagues use `lgOptRows`; chips are 44px tall like Worth a look settings.
- Add a rule: `.sheet-backdrop#sheet-rladd` (the app's glass sheet). Rules that are off, grouped Your teams and events /
  College / Pro / Soccer / Golf and racing (`rlGroups`), with tonight's game count. My teams and Big events turn on
  straight away; a league or sport opens its page with nothing picked yet (backing out adds nothing).
- Back: `rulesBack()` (hooked first in `goBack`, 070-navigation.js) closes the sheet, then the rule's page.
  Entering the page from elsewhere starts on the main list (`setView` clears `state.rulesMain`).

## Open
- `evRulesBlock` in 165-events.js and the `.lgcard` styles are no longer used by this page; remove when 165 is next touched.
