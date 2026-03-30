import { useCallback, useEffect } from "react";

interface UseKeyboardOptions {
  itemCount: number;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  showHelp: boolean;
  onShowHelpChange: (show: boolean) => void;
  onEnter?: (index: number) => void;
  onDelete?: (index: number) => void;
  onNew?: () => void;
  onTerminal?: (index: number) => void;
  onRefresh?: () => void;
  onSearch?: () => void;
  onFetch?: () => void;
  columns?: number;
}

export function useKeyboard(options: UseKeyboardOptions) {
  const {
    itemCount,
    selectedIndex,
    onSelectIndex,
    showHelp,
    onShowHelpChange,
    onEnter,
    onDelete,
    onNew,
    onTerminal,
    onRefresh,
    onSearch,
    onFetch,
    columns = 3,
  } = options;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        if (e.key === "Escape") {
          target.blur();
        }
        return;
      }

      switch (e.key) {
        // Navigation
        case "ArrowRight":
        case "l":
          e.preventDefault();
          onSelectIndex(Math.min(selectedIndex + 1, itemCount - 1));
          break;
        case "ArrowLeft":
        case "h":
          e.preventDefault();
          onSelectIndex(Math.max(selectedIndex - 1, 0));
          break;
        case "ArrowDown":
        case "j":
          e.preventDefault();
          onSelectIndex(Math.min(selectedIndex + columns, itemCount - 1));
          break;
        case "ArrowUp":
        case "k":
          e.preventDefault();
          onSelectIndex(Math.max(selectedIndex - columns, 0));
          break;

        // Actions
        case "Enter":
          e.preventDefault();
          onEnter?.(selectedIndex);
          break;
        case "d":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onDelete?.(selectedIndex);
          }
          break;
        case "n":
          e.preventDefault();
          onNew?.();
          break;
        case "t":
          e.preventDefault();
          onTerminal?.(selectedIndex);
          break;
        case "r":
          e.preventDefault();
          onRefresh?.();
          break;
        case "/":
          e.preventDefault();
          onSearch?.();
          break;
        case "F":
          e.preventDefault();
          onFetch?.();
          break;
        case "?":
          e.preventDefault();
          onShowHelpChange(!showHelp);
          break;
        case "Escape":
          onShowHelpChange(false);
          break;
      }
    },
    [
      itemCount,
      selectedIndex,
      columns,
      onSelectIndex,
      showHelp,
      onShowHelpChange,
      onEnter,
      onDelete,
      onNew,
      onTerminal,
      onRefresh,
      onSearch,
      onFetch,
    ],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Keep selected index in bounds
  useEffect(() => {
    if (selectedIndex >= itemCount && itemCount > 0) {
      onSelectIndex(itemCount - 1);
    }
  }, [itemCount, selectedIndex, onSelectIndex]);
}
