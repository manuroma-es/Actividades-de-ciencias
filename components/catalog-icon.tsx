import {
  ArrowDownUp,
  BookOpen,
  BookOpenCheck,
  Calculator,
  CircleHelp,
  Columns3,
  FlaskConical,
  Globe2,
  Group,
  Languages,
  ListChecks,
  MapPinned,
  Microscope,
  MousePointerClick,
  Music,
  Network,
  Puzzle,
  Rows3,
  Shapes,
  Tags,
} from "lucide-react";

const icons = {
  "arrow-down-up": ArrowDownUp,
  "book-open": BookOpen,
  "book-open-check": BookOpenCheck,
  calculator: Calculator,
  "circle-help": CircleHelp,
  "columns-3": Columns3,
  "flask-conical": FlaskConical,
  "globe-2": Globe2,
  group: Group,
  languages: Languages,
  "list-checks": ListChecks,
  "map-pinned": MapPinned,
  microscope: Microscope,
  "mouse-pointer-click": MousePointerClick,
  music: Music,
  network: Network,
  puzzle: Puzzle,
  "rows-3": Rows3,
  shapes: Shapes,
  tags: Tags,
} as const;

export function CatalogIcon({ name, ...props }: { name?: string } & React.ComponentProps<"svg">) {
  const Icon = icons[name as keyof typeof icons] ?? Shapes;
  return <Icon {...props} />;
}
