import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface HelpOverlayProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS = [
  {
    title: "Navigation",
    items: [
      { key: "↑↓←→ / hjkl", desc: "Navigate worktrees" },
      { key: "/", desc: "Focus search" },
      { key: "Esc", desc: "Close dialog / blur" },
    ],
  },
  {
    title: "Actions",
    items: [
      { key: "Enter", desc: "Open in editor" },
      { key: "n", desc: "New worktree" },
      { key: "d", desc: "Remove worktree" },
      { key: "t", desc: "Open in terminal" },
      { key: "c", desc: "Open Claude Code" },
    ],
  },
  {
    title: "Git",
    items: [
      { key: "f", desc: "Files / History tab" },
      { key: "F", desc: "Fetch all remotes" },
      { key: "r", desc: "Refresh" },
      { key: "?", desc: "Toggle this help" },
    ],
  },
];

export function HelpOverlay({ open, onClose }: HelpOverlayProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {SHORTCUT_GROUPS.map((group, gi) => (
            <div key={group.title}>
              {gi > 0 && <Separator className="mb-3" />}
              <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {group.title}
              </h4>
              <div className="space-y-1">
                {group.items.map(({ key, desc }) => (
                  <div key={key} className="flex items-center gap-3">
                    <kbd className="font-mono text-[11px] px-1.5 py-0.5 border rounded bg-muted min-w-[80px] text-right text-foreground">
                      {key}
                    </kbd>
                    <span className="text-xs text-muted-foreground">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
