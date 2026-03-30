use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Application configuration.
#[derive(Debug, Clone, Default, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/generated/")]
pub struct GroveConfig {
    #[serde(default)]
    pub general: GeneralConfig,
    #[serde(default)]
    pub editor: EditorConfig,
    #[serde(default)]
    pub terminal: TerminalConfig,
    #[serde(default)]
    pub claude: ClaudeConfig,
    #[serde(default)]
    pub file_sync: FileSyncConfig,
    #[serde(default)]
    pub worktree: WorktreeConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/generated/")]
pub struct GeneralConfig {
    pub theme: String,
    #[serde(default = "default_clone_dir")]
    pub clone_dir: String,
}

fn default_clone_dir() -> String {
    dirs::document_dir()
        .unwrap_or_else(|| dirs::home_dir().unwrap_or_default().join("Documents"))
        .join("Grove")
        .to_string_lossy()
        .to_string()
}

impl Default for GeneralConfig {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            clone_dir: default_clone_dir(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/generated/")]
pub struct EditorConfig {
    pub command: String,
    pub args: Vec<String>,
}

impl Default for EditorConfig {
    fn default() -> Self {
        Self {
            command: "code".to_string(),
            args: vec!["{path}".to_string()],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/generated/")]
pub struct TerminalConfig {
    pub command: String,
    pub args: Vec<String>,
}

impl Default for TerminalConfig {
    fn default() -> Self {
        Self {
            command: "ghostty".to_string(),
            args: vec![
                "-e".to_string(),
                "fish".to_string(),
                "-C".to_string(),
                "cd {path}".to_string(),
            ],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/generated/")]
pub struct ClaudeConfig {
    pub command: String,
    pub args: Vec<String>,
}

impl Default for ClaudeConfig {
    fn default() -> Self {
        Self {
            command: "claude".to_string(),
            args: vec![],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/generated/")]
pub struct FileSyncConfig {
    pub patterns: Vec<String>,
}

impl Default for FileSyncConfig {
    fn default() -> Self {
        Self {
            patterns: vec![
                ".env".to_string(),
                ".env.local".to_string(),
                ".envrc".to_string(),
            ],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/generated/")]
pub struct WorktreeConfig {
    pub base_dir: String,
    pub auto_name: bool,
}

impl Default for WorktreeConfig {
    fn default() -> Self {
        Self {
            base_dir: ".".to_string(),
            auto_name: true,
        }
    }
}

impl GroveConfig {
    /// Resolve the worktree base directory for a given repo path.
    pub fn resolve_worktree_base(&self, repo_path: &Path) -> PathBuf {
        let repo_name = repo_path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "repo".to_string());

        let pattern = self.worktree.base_dir.replace("{repo_name}", &repo_name);

        let base = PathBuf::from(&pattern);
        if base.is_absolute() {
            base
        } else {
            repo_path.join(&base)
        }
    }

    /// Build the command arguments with path substitution.
    pub fn substitute_args(args: &[String], path: &str, branch: &str) -> Vec<String> {
        args.iter()
            .map(|a| a.replace("{path}", path).replace("{branch}", branch))
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn default_config_has_system_theme() {
        let config = GroveConfig::default();
        assert_eq!(config.general.theme, "system");
    }

    #[test]
    fn default_editor_is_code() {
        let config = GroveConfig::default();
        assert_eq!(config.editor.command, "code");
        assert_eq!(config.editor.args, vec!["{path}"]);
    }

    #[test]
    fn default_terminal_is_ghostty() {
        let config = GroveConfig::default();
        assert_eq!(config.terminal.command, "ghostty");
    }

    #[test]
    fn default_claude_command() {
        let config = GroveConfig::default();
        assert_eq!(config.claude.command, "claude");
        assert!(config.claude.args.is_empty());
    }

    #[test]
    fn default_file_sync_patterns() {
        let config = GroveConfig::default();
        assert_eq!(
            config.file_sync.patterns,
            vec![".env", ".env.local", ".envrc"]
        );
    }

    #[test]
    fn default_worktree_base_dir_is_dot() {
        let config = GroveConfig::default();
        assert_eq!(config.worktree.base_dir, ".");
        assert!(config.worktree.auto_name);
    }

    #[test]
    fn resolve_worktree_base_relative() {
        let config = GroveConfig::default(); // base_dir = "."
        let repo = Path::new("/home/user/repos/my-project");
        let result = config.resolve_worktree_base(repo);
        assert_eq!(result, PathBuf::from("/home/user/repos/my-project/."));
    }

    #[test]
    fn resolve_worktree_base_with_repo_name() {
        let mut config = GroveConfig::default();
        config.worktree.base_dir = "/worktrees/{repo_name}".to_string();
        let repo = Path::new("/home/user/repos/my-project");
        let result = config.resolve_worktree_base(repo);
        assert_eq!(result, PathBuf::from("/worktrees/my-project"));
    }

    #[test]
    fn resolve_worktree_base_absolute() {
        let mut config = GroveConfig::default();
        config.worktree.base_dir = "/tmp/worktrees".to_string();
        let repo = Path::new("/home/user/repos/my-project");
        let result = config.resolve_worktree_base(repo);
        assert_eq!(result, PathBuf::from("/tmp/worktrees"));
    }

    #[test]
    fn resolve_worktree_base_relative_subdir() {
        let mut config = GroveConfig::default();
        config.worktree.base_dir = "worktrees".to_string();
        let repo = Path::new("/home/user/repos/my-project");
        let result = config.resolve_worktree_base(repo);
        assert_eq!(
            result,
            PathBuf::from("/home/user/repos/my-project/worktrees")
        );
    }

    #[test]
    fn substitute_args_replaces_path() {
        let args = vec!["{path}".to_string()];
        let result = GroveConfig::substitute_args(&args, "/my/path", "main");
        assert_eq!(result, vec!["/my/path"]);
    }

    #[test]
    fn substitute_args_replaces_branch() {
        let args = vec!["--branch".to_string(), "{branch}".to_string()];
        let result = GroveConfig::substitute_args(&args, "/my/path", "feature-x");
        assert_eq!(result, vec!["--branch", "feature-x"]);
    }

    #[test]
    fn substitute_args_replaces_both() {
        let args = vec![
            "-e".to_string(),
            "cd {path} && git checkout {branch}".to_string(),
        ];
        let result = GroveConfig::substitute_args(&args, "/repo", "dev");
        assert_eq!(result, vec!["-e", "cd /repo && git checkout dev"]);
    }

    #[test]
    fn substitute_args_no_placeholders() {
        let args = vec!["--flag".to_string(), "value".to_string()];
        let result = GroveConfig::substitute_args(&args, "/path", "main");
        assert_eq!(result, vec!["--flag", "value"]);
    }

    #[test]
    fn substitute_args_empty() {
        let args: Vec<String> = vec![];
        let result = GroveConfig::substitute_args(&args, "/path", "main");
        assert!(result.is_empty());
    }

    #[test]
    fn config_serde_roundtrip() {
        let config = GroveConfig::default();
        let toml_str = toml::to_string_pretty(&config).unwrap();
        let parsed: GroveConfig = toml::from_str(&toml_str).unwrap();
        assert_eq!(parsed.general.theme, config.general.theme);
        assert_eq!(parsed.editor.command, config.editor.command);
        assert_eq!(parsed.terminal.command, config.terminal.command);
        assert_eq!(parsed.worktree.base_dir, config.worktree.base_dir);
    }

    #[test]
    fn config_deserialize_partial_toml() {
        let toml_str = r#"
[general]
theme = "dark"
"#;
        let config: GroveConfig = toml::from_str(toml_str).unwrap();
        assert_eq!(config.general.theme, "dark");
        // Other fields should use defaults
        assert_eq!(config.editor.command, "code");
        assert_eq!(config.terminal.command, "ghostty");
    }

    #[test]
    fn config_deserialize_empty_toml() {
        let config: GroveConfig = toml::from_str("").unwrap();
        assert_eq!(config.general.theme, "system");
    }
}
