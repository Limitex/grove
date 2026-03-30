import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SortBy, ViewMode } from "@/types";

interface ToolbarProps {
  filter: string;
  onFilterChange: (value: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: SortBy;
  onSortChange: (sort: SortBy) => void;
  worktreeCount: number;
  focusSearch: boolean;
  onSearchFocused: () => void;
  onFetch?: () => void;
  fetching?: boolean;
}

const SORT_LABELS: Record<SortBy, string> = {
  recent: "Recent",
  name: "Name",
  status: "Status",
};

const SORT_ORDER: SortBy[] = ["recent", "name", "status"];

export function Toolbar({
  filter,
  onFilterChange,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
  worktreeCount,
  focusSearch,
  onSearchFocused,
  onFetch,
  fetching,
}: ToolbarProps) {
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusSearch && searchRef.current) {
      searchRef.current.focus();
      onSearchFocused();
    }
  }, [focusSearch, onSearchFocused]);

  const cycleSortBy = () => {
    const idx = SORT_ORDER.indexOf(sortBy);
    const next = SORT_ORDER[(idx + 1) % SORT_ORDER.length];
    onSortChange(next);
  };

  return (
    <div className="flex items-center gap-2 px-3.5 py-1.5 border-b">
      <Input
        ref={searchRef}
        type="text"
        placeholder={`Filter ${worktreeCount} worktrees...`}
        value={filter}
        onChange={(e) => onFilterChange(e.target.value)}
        className="h-7 text-xs flex-1"
      />
      {onFetch && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs whitespace-nowrap"
          onClick={onFetch}
          disabled={fetching}
        >
          {fetching ? <span className="animate-pulse">Fetching...</span> : "Fetch"}
        </Button>
      )}
      <div className="flex border rounded-md overflow-hidden shrink-0">
        <Button
          variant={viewMode === "grid" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 rounded-none text-xs px-2.5 border-0"
          onClick={() => onViewModeChange("grid")}
        >
          Grid
        </Button>
        <Button
          variant={viewMode === "list" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 rounded-none text-xs px-2.5 border-0"
          onClick={() => onViewModeChange("list")}
        >
          List
        </Button>
      </div>
      <Button variant="outline" size="sm" className="h-7 text-xs whitespace-nowrap shrink-0" onClick={cycleSortBy}>
        Sort: {SORT_LABELS[sortBy]}
      </Button>
    </div>
  );
}
