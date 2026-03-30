use crate::domain::error::Result;
use crate::service;

#[tauri::command]
pub async fn clone_repo(url: String, name: Option<String>) -> Result<String> {
    super::blocking(move || service::clone::clone_repo(&url, name.as_deref())).await
}

#[tauri::command]
pub async fn check_has_bare(path: String) -> Result<bool> {
    super::blocking(move || Ok(service::clone::check_has_bare(&path))).await
}

#[tauri::command]
pub async fn convert_to_bare(path: String) -> Result<String> {
    super::blocking(move || service::clone::convert_to_bare(&path)).await
}
