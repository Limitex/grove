use std::path::PathBuf;

use crate::domain::config::GroveConfig;
use crate::domain::error::{GroveError, Result};

/// Default config file path.
pub fn config_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("grove")
        .join("config.toml")
}

/// Load configuration from the default path (~/.config/grove/config.toml).
pub fn load() -> Result<GroveConfig> {
    let path = config_path();
    if path.exists() {
        let content = std::fs::read_to_string(&path)?;
        let config: GroveConfig = match toml::from_str(&content) {
            Ok(c) => c,
            Err(e) => {
                log::warn!(
                    "Failed to parse config at {}: {}, using defaults",
                    path.display(),
                    e
                );
                GroveConfig::default()
            }
        };
        Ok(config)
    } else {
        Ok(GroveConfig::default())
    }
}

/// Save configuration to the default path.
pub fn save(config: &GroveConfig) -> Result<()> {
    let path = config_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let content = toml::to_string_pretty(config).map_err(|e| GroveError::Config(e.to_string()))?;
    std::fs::write(&path, content)?;
    Ok(())
}

/// Load configuration from a specific path.
pub fn load_from(path: &std::path::Path) -> Result<GroveConfig> {
    if path.exists() {
        let content = std::fs::read_to_string(path)?;
        match toml::from_str(&content) {
            Ok(c) => Ok(c),
            Err(e) => {
                log::warn!(
                    "Failed to parse config at {}: {}, using defaults",
                    path.display(),
                    e
                );
                Ok(GroveConfig::default())
            }
        }
    } else {
        Ok(GroveConfig::default())
    }
}

/// Save configuration to a specific path.
pub fn save_to(path: &std::path::Path, config: &GroveConfig) -> Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let content = toml::to_string_pretty(config).map_err(|e| GroveError::Config(e.to_string()))?;
    std::fs::write(path, content)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn load_from_nonexistent_returns_default() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("nonexistent.toml");
        let config = load_from(&path).unwrap();
        assert_eq!(config.general.theme, "system");
    }

    #[test]
    fn save_and_load_roundtrip() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("config.toml");

        let mut config = GroveConfig::default();
        config.general.theme = "dark".to_string();
        config.editor.command = "nvim".to_string();

        save_to(&path, &config).unwrap();
        let loaded = load_from(&path).unwrap();

        assert_eq!(loaded.general.theme, "dark");
        assert_eq!(loaded.editor.command, "nvim");
        assert_eq!(loaded.terminal.command, "ghostty"); // default preserved
    }

    #[test]
    fn save_creates_parent_directories() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("sub").join("dir").join("config.toml");

        let config = GroveConfig::default();
        save_to(&path, &config).unwrap();

        assert!(path.exists());
    }

    #[test]
    fn load_invalid_toml_returns_default() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("bad.toml");
        std::fs::write(&path, "this is not valid toml {{{{").unwrap();

        let config = load_from(&path).unwrap();
        assert_eq!(config.general.theme, "system");
    }

    #[test]
    fn load_partial_toml_fills_defaults() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("partial.toml");
        std::fs::write(
            &path,
            r#"
[general]
theme = "light"
"#,
        )
        .unwrap();

        let config = load_from(&path).unwrap();
        assert_eq!(config.general.theme, "light");
        assert_eq!(config.editor.command, "code");
        assert_eq!(config.worktree.base_dir, ".");
    }

    #[test]
    fn config_path_ends_with_config_toml() {
        let path = config_path();
        assert!(path.ends_with("grove/config.toml"));
    }
}
