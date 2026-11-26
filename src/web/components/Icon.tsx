import {
  ArrowDown,
  ArrowUp,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleSlash,
  CircleX,
  Download,
  Eye,
  FilePen,
  FileText,
  FileX,
  FlaskConical,
  FolderPlus,
  Image,
  Info,
  ListTree,
  LoaderCircle,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Square,
  TextCursorInput,
  Trash,
  TriangleExclamationPoint,
  Undo2,
  X,
} from "lucide-react";

// Symbols as inline SVG (TechSpec 2.16). The only place that imports lucide-react; meaning name -> canonical
// Lucide export after the icon table of docs/ux/DESIGN.md. New meanings only via that table (hotspot, 4.4).
export const ICON_MAP = {
  "status-none": CircleDashed,
  "status-concept": CircleDot,
  "status-fixed": CircleCheck,
  "ai-running": LoaderCircle,
  info: Info,
  error: CircleX,
  aborted: CircleSlash,
  "simulated-ai": FlaskConical,
  draft: FilePen,
  "ai-sender": Bot,
  close: X,
  warning: TriangleExclamationPoint,
  locked: Lock,
  "image-link": Image,
  rename: TextCursorInput,
  "edit-objective": FileText,
  "add-child": Plus,
  "new-project": FolderPlus,
  "move-up": ArrowUp,
  "move-down": ArrowDown,
  "edit-result": Pencil,
  summarize: Sparkles,
  suggest: ListTree,
  accept: Check,
  send: Send,
  stop: Square,
  "send-again": Undo2,
  "check-again": RefreshCw,
  "show-context": Eye,
  export: Download,
  delete: Trash,
  "discard-draft": FileX,
  expand: ChevronRight,
  collapse: ChevronDown,
  // Decorative, the only shared symbol (DESIGN.md v0.4.4, AL-04).
  "breadcrumb-separator": ChevronRight,
} as const;

export type IconName = keyof typeof ICON_MAP;

/** inline 1.15 em; compact 14 px (tree row, pills); mini 12 px ("Draft" in the tree); heading 22 px (dialog head). */
const SIZES = { inline: "1.15em", compact: 14, mini: 12, heading: 22 } as const;

export function Icon({ name, size = "inline" }: { name: IconName; size?: keyof typeof SIZES }) {
  const Svg = ICON_MAP[name];
  // The accessible name is carried by the surrounding element, never by the symbol.
  return (
    <Svg
      className="icon"
      data-icon={name}
      aria-hidden="true"
      focusable="false"
      size={SIZES[size]}
      strokeWidth={1.75}
    />
  );
}
