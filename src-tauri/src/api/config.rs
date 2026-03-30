use crate::domain::config::GroveConfig;
use crate::domain::error::Result;
use crate::service;

#[tauri::command]
pub async fn get_config() -> Result<GroveConfig> {
    super::blocking(service::config::get_config).await
}

#[tauri::command]
pub async fn save_config(config: GroveConfig) -> Result<()> {
    super::blocking(move || service::config::save_config(&config)).await
}
