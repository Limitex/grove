import { invoke } from "@tauri-apps/api/core";
import type { GroveConfig } from "@/types";

export const getConfig = () => invoke<GroveConfig>("get_config");

export const saveConfig = (config: GroveConfig) => invoke<void>("save_config", { config });
