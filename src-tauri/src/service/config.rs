use crate::domain::config::GroveConfig;
use crate::domain::error::Result;
use crate::infra::persistence;

pub fn get_config() -> Result<GroveConfig> {
    persistence::config::load()
}

pub fn save_config(config: &GroveConfig) -> Result<()> {
    persistence::config::save(config)
}
