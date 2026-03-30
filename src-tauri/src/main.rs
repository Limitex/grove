#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Workaround: WebKitGTK DMABUF renderer crashes on NVIDIA + Wayland
    #[cfg(target_os = "linux")]
    if std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").is_err() {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }

    grove_lib::run()
}
