import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface CommitBoxProps {
  onCommit: (message: string) => void;
  disabled: boolean;
}

export function CommitBox({ onCommit, disabled }: CommitBoxProps) {
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");

  const handleCommit = useCallback(() => {
    const trimmed = summary.trim();
    if (!trimmed) return;
    const desc = description.trim();
    const message = desc ? `${trimmed}\n\n${desc}` : trimmed;
    onCommit(message);
    setSummary("");
    setDescription("");
  }, [summary, description, onCommit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleCommit();
      }
    },
    [handleCommit],
  );

  return (
    <div className="flex flex-col gap-1.5 px-2 py-2 border-t bg-muted/30 shrink-0" onKeyDown={handleKeyDown}>
      <Input
        type="text"
        placeholder="Summary"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        disabled={disabled}
        className="h-6 text-[11px]"
      />
      <Textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={disabled}
        rows={2}
        className="min-h-0 text-[11px] resize-none py-1"
      />
      <Button
        size="sm"
        className="h-6 text-[10px] w-full"
        onClick={handleCommit}
        disabled={disabled || !summary.trim()}
      >
        Commit{summary.trim() ? ` — ${summary.trim().slice(0, 30)}${summary.trim().length > 30 ? "..." : ""}` : ""}
      </Button>
    </div>
  );
}
