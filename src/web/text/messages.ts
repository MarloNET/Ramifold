// All texts of the web-ui (REQ-068). Keys are MSG/TERM ids or `screen.element`; wording only from the UI/UX Design
// (docs/ux/screens/*/screen.md, docs/ux/DESIGN.md, docs/ux/uiux-design.md). English also on German systems.

export const messages = {
  "AppHeader.brand": "Ramifold",
  "AppHeader.projectFolder": (displayPath: string) => `Project folder: ${displayPath}`,
  "AppHeader.dataNotice": "Data notice",
  "AppHeader.simulatedAi": "Simulated AI",
  "AppHeader.simulatedAiTooltip": "AI answers are simulated and do not come from a real AI.",

  "UI-001.heading": "Projects",
  "UI-001.loading": "Loading projects…",
  "UI-001.empty": "No project in this folder yet.",
  "UI-001.newProject": "New project",
  "UI-001.columnTitle": "Title",
  "UI-001.columnCreated": "Created",
  "UI-001.untitled": "(untitled)",
  "UI-001.pageTitle": (folderName: string) => `Projects – ${folderName} – Ramifold`,
  "UI-001.columnActions": "Actions",
  "UI-001.notReadable": "Not readable",
  "UI-001.details": "Details",

  "UI-011.title": (title: string) => `${title} cannot be opened`,
  "UI-011.titleUntitled": "This project cannot be opened",
  "UI-011.text": "Ramifold cannot read the data of this project. Ramifold did not change anything.",
  "UI-011.cause": "Cause",
  "UI-011.location": "Location",
  "UI-011.causeGitConflict": "Git conflict",
  "UI-011.causeDamaged": "Damaged data",
  "UI-011.causeNewerVersion": "Data from a newer Ramifold version",
  "UI-011.causeInconsistent": "Inconsistent data",
  "UI-011.instruction":
    "Resolve the problem in your project folder, restart Ramifold, and open the project again. Your other projects are not affected.",
  "UI-011.close": "Close",
} as const;
