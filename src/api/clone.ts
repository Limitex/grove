import { invoke } from "@tauri-apps/api/core";

export const cloneRepo = (url: string, name: string | null) => invoke<string>("clone_repo", { url, name });

export const checkHasBare = (path: string) => invoke<boolean>("check_has_bare", { path });

export const convertToBare = (path: string) => invoke<string>("convert_to_bare", { path });
