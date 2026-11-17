import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CircleCheck,
  Clock,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Link2,
  LoaderCircle,
  LogOut,
  Mail,
  Plus,
  Search,
  ShieldCheck,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

// One place that maps our icon names to the Lucide icon library, so every screen
// uses the same professional icon style. Never use emoji in the interface.
const ICONS = {
  plus: Plus,
  search: Search,
  check: Check,
  chevronDown: ChevronDown,
  checkCircle: CircleCheck,
  copy: Copy,
  document: FileText,
  clock: Clock,
  eye: Eye,
  eyeOff: EyeOff,
  users: Users,
  shield: ShieldCheck,
  mail: Mail,
  arrowRight: ArrowRight,
  arrowLeft: ArrowLeft,
  logout: LogOut,
  link: Link2,
  bolt: Zap,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const Component = ICONS[name];
  return <Component className={className} strokeWidth={1.75} aria-hidden="true" />;
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return <LoaderCircle className={`animate-spin ${className}`} aria-hidden="true" />;
}
