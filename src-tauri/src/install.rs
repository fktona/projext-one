use std::process::Command;
use tauri::Emitter;

pub fn install_screenpipe() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let command =
            "iwr https://raw.githubusercontent.com/eketeUg/projectOne/main/install.ps1 | iex";
        let output = Command::new("powershell")
            .args(&["-NoProfile", "-Command", command])
            .output();

        match output {
            Ok(output) if output.status.success() => {
                Ok("Screenpipe installed successfully.".to_string())
            }
            Ok(output) => Err(String::from_utf8_lossy(&output.stderr).to_string()),
            Err(e) => Err(e.to_string()),
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Screenpipe install is only supported on Windows.".to_string())
    }
}

pub fn install_ollama(app_handle: &tauri::AppHandle) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        // Emit progress event
        let _ = app_handle.emit("install-progress", serde_json::json!({
            "type": "ollama",
            "status": "starting",
            "message": "Starting Ollama installation via winget..."
        }));

        // Use winget to install Ollama on Windows
        let output = Command::new("winget")
            .args(&["install", "ollama.ollama"])
            .output();

        match output {
            Ok(output) if output.status.success() => {
                let _ = app_handle.emit("install-progress", serde_json::json!({
                    "type": "ollama",
                    "status": "completed",
                    "message": "Ollama installed successfully via winget. Please restart your terminal and try again."
                }));
                Ok("Ollama installed successfully via winget. Please restart your terminal and try again.".to_string())
            }
            Ok(output) => {
                let stderr = String::from_utf8_lossy(&output.stderr);
                let _ = app_handle.emit("install-progress", serde_json::json!({
                    "type": "ollama",
                    "status": "error",
                    "message": format!("Installation failed: {}", stderr)
                }));
                if stderr.contains("not found") || stderr.contains("not recognized") {
                    Err("winget not available. Please install Ollama manually from https://ollama.ai/download".to_string())
                } else {
                    Err(format!("Failed to install Ollama: {}", stderr))
                }
            }
            Err(e) => {
                let _ = app_handle.emit("install-progress", serde_json::json!({
                    "type": "ollama",
                    "status": "error",
                    "message": format!("Installation failed: {}", e)
                }));
                if e.kind() == std::io::ErrorKind::NotFound {
                    Err("winget not available. Please install Ollama manually from https://ollama.ai/download".to_string())
                } else {
                    Err(format!("Failed to install Ollama: {}", e))
                }
            }
        }
    }
    #[cfg(target_os = "macos")]
    {
        let _ = app_handle.emit("install-progress", serde_json::json!({
            "type": "ollama",
            "status": "starting",
            "message": "Starting Ollama installation via curl..."
        }));

        // Use curl to install Ollama on macOS
        let output = Command::new("curl")
            .args(&["-fsSL", "https://ollama.ai/install.sh"])
            .output();

        match output {
            Ok(output) if output.status.success() => {
                let _ = app_handle.emit("install-progress", serde_json::json!({
                    "type": "ollama",
                    "status": "completed",
                    "message": "Ollama installed successfully. Please restart your terminal and try again."
                }));
                Ok("Ollama installed successfully. Please restart your terminal and try again.".to_string())
            }
            Ok(output) => {
                let stderr = String::from_utf8_lossy(&output.stderr);
                let _ = app_handle.emit("install-progress", serde_json::json!({
                    "type": "ollama",
                    "status": "error",
                    "message": format!("Installation failed: {}", stderr)
                }));
                Err(stderr.to_string())
            }
            Err(e) => {
                let _ = app_handle.emit("install-progress", serde_json::json!({
                    "type": "ollama",
                    "status": "error",
                    "message": format!("Installation failed: {}", e)
                }));
                Err(format!("Failed to install Ollama: {}", e))
            }
        }
    }
    #[cfg(target_os = "linux")]
    {
        let _ = app_handle.emit("install-progress", serde_json::json!({
            "type": "ollama",
            "status": "starting",
            "message": "Starting Ollama installation via curl..."
        }));

        // Use curl to install Ollama on Linux
        let output = Command::new("curl")
            .args(&["-fsSL", "https://ollama.ai/install.sh"])
            .output();

        match output {
            Ok(output) if output.status.success() => {
                let _ = app_handle.emit("install-progress", serde_json::json!({
                    "type": "ollama",
                    "status": "completed",
                    "message": "Ollama installed successfully. Please restart your terminal and try again."
                }));
                Ok("Ollama installed successfully. Please restart your terminal and try again.".to_string())
            }
            Ok(output) => {
                let stderr = String::from_utf8_lossy(&output.stderr);
                let _ = app_handle.emit("install-progress", serde_json::json!({
                    "type": "ollama",
                    "status": "error",
                    "message": format!("Installation failed: {}", stderr)
                }));
                Err(stderr.to_string())
            }
            Err(e) => {
                let _ = app_handle.emit("install-progress", serde_json::json!({
                    "type": "ollama",
                    "status": "error",
                    "message": format!("Installation failed: {}", e)
                }));
                Err(format!("Failed to install Ollama: {}", e))
            }
        }
    }
}

pub fn install_ollama_model(model: String, app_handle: &tauri::AppHandle) -> Result<String, String> {
    let _ = app_handle.emit("install-progress", serde_json::json!({
        "type": "model",
        "model": model.clone(),
        "status": "starting",
        "message": format!("Starting download of model: {}", model)
    }));

    // Start the ollama pull command
    let mut child = match std::process::Command::new("ollama")
        .arg("pull")
        .arg(&model)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn() {
            Ok(child) => child,
            Err(e) => {
                let _ = app_handle.emit("install-progress", serde_json::json!({
                    "type": "model",
                    "model": model.clone(),
                    "status": "error",
                    "message": format!("Failed to start ollama pull: {}", e)
                }));
                return Err(e.to_string());
            }
    };

    // Function to process output lines
    let process_line = |line: &str, app_handle: &tauri::AppHandle, model: &str| {
        if line.contains("pulling") || line.contains("downloading") || line.contains("Downloading") {
            let _ = app_handle.emit("install-progress", serde_json::json!({
                "type": "model",
                "model": model,
                "status": "progress",
                "message": line.trim()
            }));
        } else if line.contains("verifying") || line.contains("Verifying") {
            let _ = app_handle.emit("install-progress", serde_json::json!({
                "type": "model",
                "model": model,
                "status": "verifying",
                "message": "Verifying model integrity..."
            }));
        } else if line.contains("writing") || line.contains("Writing") {
            let _ = app_handle.emit("install-progress", serde_json::json!({
                "type": "model",
                "model": model,
                "status": "writing",
                "message": "Writing model to disk..."
            }));
        }
    };

    // Read output in real-time from both stdout and stderr
    use std::io::{BufRead, BufReader};
    use std::thread;
    
    let app_handle_clone = app_handle.clone();
    let model_clone = model.clone();
    
    // Spawn a thread to read stdout
    let stdout_handle = if let Some(stdout) = child.stdout.take() {
        let app_handle = app_handle_clone.clone();
        let model = model_clone.clone();
        Some(thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                if let Ok(line) = line {
                    process_line(&line, &app_handle, &model);
                }
            }
        }))
    } else {
        None
    };

    // Spawn a thread to read stderr
    let stderr_handle = if let Some(stderr) = child.stderr.take() {
        let app_handle = app_handle_clone.clone();
        let model = model_clone.clone();
        Some(thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                if let Ok(line) = line {
                    process_line(&line, &app_handle, &model);
                }
            }
        }))
    } else {
        None
    };

    // Wait for output threads to complete
    if let Some(handle) = stdout_handle {
        let _ = handle.join();
    }
    if let Some(handle) = stderr_handle {
        let _ = handle.join();
    }

    // Wait for the process to complete
    match child.wait() {
        Ok(status) if status.success() => {
            let _ = app_handle.emit("install-progress", serde_json::json!({
                "type": "model",
                "model": model.clone(),
                "status": "completed",
                "message": format!("Model {} installed successfully.", model)
            }));
            Ok(format!("Model {} installed successfully.", model))
        }
        Ok(status) => {
            let _ = app_handle.emit("install-progress", serde_json::json!({
                "type": "model",
                "model": model.clone(),
                "status": "error",
                "message": format!("Model installation failed with status: {}", status)
            }));
            Err(format!("Model installation failed with status: {}", status))
        }
        Err(e) => {
            let _ = app_handle.emit("install-progress", serde_json::json!({
                "type": "model",
                "model": model.clone(),
                "status": "error",
                "message": format!("Model installation failed: {}", e)
            }));
            Err(e.to_string())
        }
    }
}
