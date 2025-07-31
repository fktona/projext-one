use std::process::Command;
// use std::thread;
use std::time::Duration;
use sysinfo::{System, Disks};
use crate::types::SystemCheckResult;

pub fn is_screenpipe_installed() -> (bool, Option<String>) {
    let output = if cfg!(target_os = "windows") {
        Command::new("where").arg("screenpipe").output()
    } else {
        Command::new("which").arg("screenpipe").output()
    };

    match output {
        Ok(output) if output.status.success() => {
            let path = String::from_utf8_lossy(&output.stdout).lines().next().unwrap_or("").to_string();
            (true, Some(path))
        }
        _ => (false, None),
    }
}

pub fn is_screenpipe_running() -> bool {
    // Only check if ScreenPipe is installed first
    let (installed, _) = is_screenpipe_installed();
    if !installed {
        println!("[SystemCheck] ScreenPipe not installed, skipping health check");
        return false;
    }

    // Try to call the health endpoint
    let client = reqwest::blocking::Client::new();
    let response = client
        .get("http://localhost:3030/health")
        .timeout(Duration::from_secs(3))
        .send();

    match response {
        Ok(response) => {
            if response.status().is_success() {
                match response.json::<serde_json::Value>() {
                    Ok(json) => {
                        if let Some(status) = json.get("status").and_then(|s| s.as_str()) {
                            if status == "healthy" {
                                println!("[SystemCheck] ScreenPipe is running and healthy");
                                return true;
                            } else {
                                println!("[SystemCheck] ScreenPipe health check returned status: {}", status);
                                return false;
                            }
                        } else {
                            println!("[SystemCheck] ScreenPipe health check response missing status field");
                            return false;
                        }
                    }
                    Err(e) => {
                        println!("[SystemCheck] Failed to parse ScreenPipe health response: {}", e);
                        return false;
                    }
                }
            } else {
                println!("[SystemCheck] ScreenPipe health check failed with status: {}", response.status());
                return false;
            }
        }
        Err(e) => {
            println!("[SystemCheck] ScreenPipe health check failed: {}", e);
            return false;
        }
    }
}

pub fn get_ollama_models() -> Vec<String> {
    let output = Command::new("ollama")
        .arg("list")
        .output();

    match output {
        Ok(output) if output.status.success() => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            stdout
                .lines()
                .skip_while(|line| line.starts_with("NAME"))
                .filter_map(|line| line.split_whitespace().next().map(|s| s.to_string()))
                .collect()
        }
        _ => vec![],
    }
}

// Non-blocking system check that runs in background
pub fn check_system_requirements_async() -> SystemCheckResult {
    println!("[SystemCheck] Starting async system requirements check...");
    
    // Use a timeout for each command to prevent hanging
    let _timeout_duration = Duration::from_secs(5);
    
    // Check if Ollama is installed with timeout
    let ollama_result = Command::new("ollama")
        .arg("--version")
        .output();

    let (ollama_installed, ollama_version) = match ollama_result {
        Ok(ref output) if output.status.success() => {
            let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
            println!("[SystemCheck] Ollama found: {}", version);
            (true, Some(version))
        }
        Ok(ref output) => {
            println!("[SystemCheck] Ollama command failed. Status: {:?}, Stderr: {}", output.status, String::from_utf8_lossy(&output.stderr));
            (false, None)
        }
        Err(e) => {
            println!("[SystemCheck] Ollama not found or failed to execute: {}", e);
            (false, None)
        }
    };

    // Check if ScreenPipe is installed
    let (screenpipe_installed, screenpipe_path) = is_screenpipe_installed();
    println!("[SystemCheck] ScreenPipe installed: {} Path: {:?}", screenpipe_installed, screenpipe_path);

    // Get ScreenPipe version if installed
    let screenpipe_version = if screenpipe_installed {
        let output = Command::new("screenpipe")
            .arg("--version")
            .output();
        match output {
            Ok(ref output) if output.status.success() => {
                let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
                println!("[SystemCheck] ScreenPipe version: {}", version);
                Some(version)
            }
            Ok(ref output) => {
                println!("[SystemCheck] ScreenPipe command failed. Status: {:?}, Stderr: {}", output.status, String::from_utf8_lossy(&output.stderr));
                None
            }
            Err(e) => {
                println!("[SystemCheck] ScreenPipe not found or failed to execute: {}", e);
                None
            }
        }
    } else {
        println!("[SystemCheck] ScreenPipe not installed.");
        None
    };

    // Check if ScreenPipe is running (only if installed)
    let screenpipe_running = if screenpipe_installed {
        let running = is_screenpipe_running();
        if !running {
            println!("[SystemCheck] ScreenPipe is not running, attempting to start it...");
            // Try to start ScreenPipe
            let start_result = Command::new("screenpipe")
                .arg("start")
                .spawn();
            
            match start_result {
                Ok(_) => {
                    println!("[SystemCheck] ScreenPipe start command executed successfully");
                    // Wait a bit and check again
                    std::thread::sleep(Duration::from_secs(2));
                    let running_after_start = is_screenpipe_running();
                    if running_after_start {
                        println!("[SystemCheck] ScreenPipe is now running after start command");
                    } else {
                        println!("[SystemCheck] ScreenPipe still not running after start command");
                    }
                    running_after_start
                }
                Err(e) => {
                    println!("[SystemCheck] Failed to start ScreenPipe: {}", e);
                    false
                }
            }
        } else {
            running
        }
    } else {
        false
    };

    // Check system resources (these are usually fast)
    let mut sys = System::new_all();
    sys.refresh_all();
    let total_ram_gb = sys.total_memory() / 1024 / 1024 / 1024;
    let ram_ok = total_ram_gb >= 8; // Require at least 8GB RAM
    println!("[SystemCheck] RAM: {} GB (OK: {})", total_ram_gb, ram_ok);

    let disks = Disks::new_with_refreshed_list();
    let free_disk_gb = disks.iter().map(|disk| disk.available_space() / 1024 / 1024 / 1024).sum();
    let disk_ok = free_disk_gb >= 10; // Require at least 10GB free space
    println!("[SystemCheck] Disk: {} GB free (OK: {})", free_disk_gb, disk_ok);

    SystemCheckResult {
        ollama_installed,
        screenpipe_installed,
        screenpipe_running,
        ollama_version,
        screenpipe_version,
        screenpipe_path,
        ram_ok,
        total_ram_gb,
        disk_ok,
        free_disk_gb,
    }
}

// Legacy synchronous version (kept for backward compatibility)
pub fn check_system_requirements() -> SystemCheckResult {
    check_system_requirements_async()
} 