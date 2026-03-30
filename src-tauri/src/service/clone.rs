use std::path::PathBuf;

use crate::domain::error::Result;
use crate::infra::persistence;
use crate::infra::repository;

pub fn clone_repo(url: &str, name: Option<&str>) -> Result<String> {
    let config = persistence::config::load()?;
    let clone_dir = PathBuf::from(&config.general.clone_dir);
    let bare_path = repository::clone::clone_repo(url, &clone_dir, name)?;
    Ok(bare_path.to_string_lossy().to_string())
}

pub fn check_has_bare(path: &str) -> bool {
    PathBuf::from(path).join(".bare").is_dir()
}

pub fn convert_to_bare(path: &str) -> Result<String> {
    let repo_path = PathBuf::from(path);
    let result = repository::clone::convert_to_bare(&repo_path)?;
    Ok(result.to_string_lossy().to_string())
}
