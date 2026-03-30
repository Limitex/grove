import { invoke } from "@tauri-apps/api/core";
import type { RepoEntry } from "@/types";

export const listRepos = () => invoke<RepoEntry[]>("list_repos");

export const addRepo = (path: string) => invoke<RepoEntry[]>("add_repo", { path });

export const removeRepo = (path: string) => invoke<RepoEntry[]>("remove_repo", { path });

export const switchRepo = (path: string) => invoke<void>("switch_repo", { path });

export const getRepoPath = () => invoke<string | null>("get_repo_path");

export const validateRepo = () => invoke<string[]>("validate_repo");
