pub mod api;
pub mod domain;
pub mod infra;
pub mod service;
pub mod state;

use infra::persistence::repo_store::RepoStore;
use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    // Restore last active repo from persistent storage
    let app_state = AppState::new();
    let store = RepoStore::load();
    if let Some(idx) = store.active_index {
        if let Some(entry) = store.repos.get(idx) {
            let _ = app_state.set_repo_path(Some(std::path::PathBuf::from(&entry.path)));
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            // Repo management
            api::repo::list_repos,
            api::repo::add_repo,
            api::repo::remove_repo,
            api::repo::switch_repo,
            api::repo::get_active_repo,
            api::repo::set_repo_path,
            api::repo::get_repo_path,
            api::repo::list_worktrees,
            api::repo::validate_repo,
            // Worktree operations
            api::worktree::worktree_status,
            api::worktree::create_worktree,
            api::worktree::remove_worktree,
            api::worktree::prune_worktrees,
            api::worktree::list_branches,
            api::worktree::get_commit_history,
            // Config
            api::config::get_config,
            api::config::save_config,
            // Launch operations
            api::launch::open_in_editor,
            api::launch::open_in_terminal,
            api::launch::open_in_file_manager,
            // Claude sessions
            api::claude::open_claude_code,
            api::claude::has_claude_session,
            api::claude::list_claude_sessions,
            api::claude::attach_claude_session,
            api::claude::kill_claude_session,
            api::claude::list_all_claude_sessions,
            // Diff & files
            api::diff::get_changed_files,
            api::diff::get_file_diff,
            api::diff::get_commit_changed_files,
            api::diff::get_commit_file_diff,
            api::diff::get_commit_full_diff,
            api::diff::get_range_changed_files,
            api::diff::get_range_full_diff,
            api::diff::get_range_file_diff,
            // Remote
            api::remote::fetch_all,
            api::remote::pull_worktree,
            api::remote::push_worktree,
            // Staging
            api::staging::stage_file,
            api::staging::unstage_file,
            api::staging::stage_all,
            api::staging::unstage_all,
            api::staging::discard_file,
            // Commit
            api::commit::git_commit,
            api::commit::amend_commit,
            api::commit::revert_commit,
            api::commit::reset_to_commit,
            // Clone
            api::clone::clone_repo,
            api::clone::check_has_bare,
            api::clone::convert_to_bare,
            // Rebase
            api::rebase::squash_commits,
            api::rebase::cherry_pick,
            api::rebase::interactive_rebase,
            api::rebase::abort_rebase,
            api::rebase::continue_rebase,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Grove");
}
