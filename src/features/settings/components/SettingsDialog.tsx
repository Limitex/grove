import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import * as configApi from "@/api/config";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { GroveConfig } from "@/types";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onThemeChange?: (theme: string) => void;
}

export function SettingsDialog({ open, onClose, onThemeChange }: SettingsDialogProps) {
  const [config, setConfig] = useState<GroveConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      configApi
        .getConfig()
        .then(setConfig)
        .catch((err) => toast.error("Failed to load settings", { description: String(err) }));
      setError(null);
      setSaved(false);
    }
  }, [open]);

  const handleSave = useCallback(async () => {
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      await configApi.saveConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }, [config]);

  if (!config) return null;

  const update = (section: keyof GroveConfig, field: string, value: string) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return { ...prev, [section]: { ...(prev[section] as Record<string, unknown>), [field]: value } };
    });
    setSaved(false);
  };

  const updateArray = (section: keyof GroveConfig, field: string, value: string) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [section]: {
          ...(prev[section] as Record<string, unknown>),
          [field]: value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        },
      };
    });
    setSaved(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
        onKeyDown={(e) => {
          if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSave();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <Section title="Editor">
            <Field
              label="Command"
              value={config.editor.command}
              onChange={(v) => update("editor", "command", v)}
              placeholder="code"
            />
            <Field
              label="Arguments"
              value={config.editor.args.join(", ")}
              onChange={(v) => updateArray("editor", "args", v)}
              placeholder="{path}"
              mono
            />
          </Section>

          <Section title="Terminal">
            <Field
              label="Command"
              value={config.terminal.command}
              onChange={(v) => update("terminal", "command", v)}
              placeholder="ghostty"
            />
            <Field
              label="Arguments"
              value={config.terminal.args.join(", ")}
              onChange={(v) => updateArray("terminal", "args", v)}
              placeholder="-e, fish, -C, cd {path}"
              mono
            />
          </Section>

          <Section title="Claude Code">
            <Field
              label="Command"
              value={config.claude.command}
              onChange={(v) => update("claude", "command", v)}
              placeholder="claude"
            />
            <Field
              label="Arguments (optional)"
              value={config.claude.args.join(", ")}
              onChange={(v) => updateArray("claude", "args", v)}
              placeholder=""
              mono
            />
          </Section>

          <Section title="File sync">
            <Field
              label="Files to copy to new worktrees (comma-separated)"
              value={config.file_sync.patterns.join(", ")}
              onChange={(v) => updateArray("file_sync", "patterns", v)}
              placeholder=".env, .env.local, .envrc"
              mono
            />
          </Section>

          <Section title="Worktree">
            <Field
              label="Base directory pattern"
              value={config.worktree.base_dir}
              onChange={(v) => update("worktree", "base_dir", v)}
              placeholder="."
              mono
            />
            <p className="text-xs text-muted-foreground mt-1">
              {"Relative to repo root. Use {repo_name} as placeholder."}
            </p>
          </Section>

          <Section title="Clone">
            <Field
              label="Clone directory"
              value={config.general.clone_dir}
              onChange={(v) => update("general", "clone_dir", v)}
              placeholder="~/Documents/Grove"
              mono
            />
            <p className="text-xs text-muted-foreground mt-1">
              Repositories will be cloned as bare repos into this directory.
            </p>
          </Section>

          <Section title="Theme">
            <Label className="text-xs">Appearance</Label>
            <Select
              value={config.general.theme}
              onValueChange={(v) => {
                update("general", "theme", v);
                onThemeChange?.(v);
              }}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </Section>

          {error && <div className="text-xs text-destructive bg-destructive/10 px-2.5 py-1.5 rounded-md">{error}</div>}
        </div>

        <DialogFooter>
          {saved && <span className="text-xs text-primary mr-auto">Saved</span>}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide mb-2">{title}</h3>
      {children}
      <Separator className="mt-4" />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  mono?: boolean;
}) {
  return (
    <div className="mt-2 space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`h-8 ${mono ? "font-mono text-xs" : ""}`}
      />
    </div>
  );
}
