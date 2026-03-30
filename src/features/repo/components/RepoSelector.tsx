import { ask } from "@tauri-apps/plugin-dialog";
import { ChevronDown, FolderOpen, GitBranch, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RepoEntry } from "@/types";

interface RepoSelectorProps {
  repos: RepoEntry[];
  activeRepoPath: string | null;
  onSwitch: (path: string) => void;
  onClone: () => void;
  onOpenExisting: () => void;
  onRemove: (path: string) => void;
}

export function RepoSelector({
  repos,
  activeRepoPath,
  onSwitch,
  onClone,
  onOpenExisting,
  onRemove,
}: RepoSelectorProps) {
  const activeRepo = repos.find((r) => r.path === activeRepoPath);
  const displayName = activeRepo?.name ?? "No repository";

  if (repos.length === 0) {
    return (
      <Button variant="outline" size="sm" className="h-6 px-2 text-xs text-muted-foreground" onClick={onClone}>
        {displayName}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="outline" size="sm" className="h-6 px-2 text-xs text-muted-foreground max-w-[160px]">
          <span className="truncate">{displayName}</span>
          <ChevronDown className="w-3 h-3 ml-1 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[260px]">
        {repos.map((repo) => (
          <DropdownMenuItem
            key={repo.path}
            className={`flex items-center justify-between gap-2 ${repo.path === activeRepoPath ? "bg-accent" : ""}`}
            onClick={() => onSwitch(repo.path)}
          >
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium">{repo.name}</span>
              <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">
                {shortenPath(repo.path)}
              </span>
            </div>
            <span
              role="button"
              tabIndex={0}
              className="inline-flex items-center justify-center h-5 w-5 rounded-sm text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
              onClick={async (e) => {
                e.stopPropagation();
                const yes = await ask(
                  `Remove "${repo.name}" from Grove?\n\nThis only removes it from the list — the repository on disk will not be deleted.`,
                  { title: "Remove repository", kind: "warning" },
                );
                if (yes) onRemove(repo.path);
              }}
            >
              <X className="w-3 h-3" />
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-primary gap-2" onClick={onClone}>
          <GitBranch className="w-3.5 h-3.5" />
          Clone repository
        </DropdownMenuItem>
        <DropdownMenuItem className="text-muted-foreground gap-2" onClick={onOpenExisting}>
          <FolderOpen className="w-3.5 h-3.5" />
          Open existing...
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function shortenPath(path: string): string {
  return path.replace(/^\/home\/[^/]+/, "~");
}
