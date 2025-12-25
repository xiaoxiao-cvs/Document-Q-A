use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

// 存储后端进程的全局状态
struct BackendProcess(Mutex<Option<CommandChild>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(BackendProcess(Mutex::new(None)))
        .setup(|app| {
            // 日志插件（调试模式）
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // 启动后端服务
            #[cfg(not(debug_assertions))]
            let shell = app.shell();
            
            // 获取后端可执行文件的路径
            // 在开发模式下，从项目根目录运行 Python
            // 在生产模式下，运行打包的可执行文件
            #[cfg(debug_assertions)]
            {
                log::info!("开发模式：使用 Python 运行后端");
                // 开发模式下，我们假设用户自己启动后端
                // 或者可以在这里添加启动 Python 的逻辑
            }

            #[cfg(not(debug_assertions))]
            {
                use std::path::PathBuf;
                
                log::info!("生产模式：启动打包的后端服务");
                
                // 获取用户数据目录
                let data_dir = if cfg!(target_os = "windows") {
                    let appdata = std::env::var("APPDATA").unwrap_or_else(|_| {
                        dirs::home_dir()
                            .unwrap()
                            .join("AppData\\Roaming")
                            .to_string_lossy()
                            .to_string()
                    });
                    PathBuf::from(appdata).join("Document-QA")
                } else if cfg!(target_os = "macos") {
                    dirs::home_dir()
                        .unwrap()
                        .join("Library")
                        .join("Application Support")
                        .join("Document-QA")
                } else {
                    dirs::home_dir().unwrap().join(".document-qa")
                };
                
                // 确保目录存在
                std::fs::create_dir_all(&data_dir).ok();
                
                let sidecar = shell
                    .sidecar("backend")
                    .expect("无法找到后端可执行文件")
                    .current_dir(data_dir);
                
                match sidecar.spawn() {
                    Ok((mut rx, child)) => {
                        log::info!("后端服务已启动");
                        
                        // 存储子进程句柄
                        let state = app.state::<BackendProcess>();
                        *state.0.lock().unwrap() = Some(child);
                        
                        // 异步读取后端输出
                        tauri::async_runtime::spawn(async move {
                            while let Some(event) = rx.recv().await {
                                match event {
                                    CommandEvent::Stdout(line) => {
                                        log::info!("[Backend] {}", String::from_utf8_lossy(&line));
                                    }
                                    CommandEvent::Stderr(line) => {
                                        log::warn!("[Backend] {}", String::from_utf8_lossy(&line));
                                    }
                                    CommandEvent::Error(err) => {
                                        log::error!("[Backend] Error: {}", err);
                                    }
                                    CommandEvent::Terminated(payload) => {
                                        log::info!("[Backend] 进程退出: {:?}", payload);
                                        break;
                                    }
                                    _ => {}
                                }
                            }
                        });
                    }
                    Err(e) => {
                        log::error!("启动后端服务失败: {}", e);
                    }
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            // 窗口关闭时终止后端进程
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                log::info!("窗口关闭，正在终止后端服务...");
                let state = window.state::<BackendProcess>();
                // 先获取 child，释放锁后再使用
                let child_option = { state.0.lock().unwrap().take() };
                if let Some(child) = child_option {
                    match child.kill() {
                        Ok(_) => log::info!("后端服务已终止"),
                        Err(e) => log::error!("终止后端服务失败: {}", e),
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
