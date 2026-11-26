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
} as const;
