use std::process::Command;

pub fn install_screenpipe() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let command = "iwr https://raw.githubusercontent.com/eketeUg/projectOne/main/install.ps1 | iex";
        let output = Command::new("powershell")
            .args(&["-NoProfile", "-Command", command])
            .output();

        match output {
            Ok(output) if output.status.success() => Ok("Screenpipe installed successfully.".to_string()),
            Ok(output) => Err(String::from_utf8_lossy(&output.stderr).to_string()),
            Err(e) => Err(e.to_string()),
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Screenpipe install is only supported on Windows.".to_string())
    }
}

pub fn install_ollama_model(model: String) -> Result<String, String> {
    let output = std::process::Command::new("ollama")
        .arg("pull")
        .arg(&model)
        .output();

    match output {
        Ok(output) if output.status.success() => Ok(format!("Model {} installed successfully.", model)),
        Ok(output) => Err(String::from_utf8_lossy(&output.stderr).to_string()),
        Err(e) => Err(e.to_string()),
    }
} 