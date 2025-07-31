use std::path::Path;
use serde::{Serialize, Deserialize};
use anyhow::Result;
use base64::Engine;

#[derive(Serialize, Deserialize)]
pub struct AppIconQuery {
    pub name: String,
    pub path: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct AppIcon {
    pub data: Vec<u8>,
    pub format: String,
}

pub async fn get_app_icon(app_name: &str, app_path: Option<&str>) -> Result<Option<AppIcon>> {
    #[cfg(target_os = "windows")]
    {
        get_windows_app_icon(app_name, app_path).await
    }

    #[cfg(target_os = "macos")]
    {
        get_macos_app_icon(app_name, app_path).await
    }

    #[cfg(target_os = "linux")]
    {
        get_linux_app_icon(app_name, app_path).await
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Err(anyhow::anyhow!("Platform not supported"))
    }
}

#[cfg(target_os = "windows")]
async fn get_windows_app_icon(app_name: &str, app_path: Option<&str>) -> Result<Option<AppIcon>> {
    use std::process::Command;
    use std::io::Read;
    use std::fs::File;
    
    // Try to find the executable path
    let exe_path = if let Some(path) = app_path {
        path.to_string()
    } else {
        // Try to find the app in common locations
        let common_paths = vec![
            format!("C:\\Program Files\\{}\\{}.exe", app_name, app_name),
            format!("C:\\Program Files (x86)\\{}\\{}.exe", app_name, app_name),
            format!("C:\\Users\\{}\\AppData\\Local\\{}\\{}.exe", 
                   std::env::var("USERNAME").unwrap_or_default(), app_name, app_name),
        ];
        
        let mut found_path = None;
        for path in common_paths {
            if Path::new(&path).exists() {
                found_path = Some(path);
                break;
            }
        }
        
        found_path.ok_or_else(|| anyhow::anyhow!("Could not find executable for {}", app_name))?
    };

    // Use PowerShell to extract icon
    let ps_script = format!(
        r#"
        Add-Type -AssemblyName System.Drawing
        try {{
            $icon = [System.Drawing.Icon]::ExtractAssociatedIcon('{}')
            if ($icon) {{
                $stream = New-Object System.IO.MemoryStream
                $icon.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
                $bytes = $stream.ToArray()
                $stream.Close()
                [System.Convert]::ToBase64String($bytes)
            }}
        }} catch {{
            Write-Error $_.Exception.Message
        }}
        "#,
        exe_path
    );

    let output = Command::new("powershell")
        .args(&["-Command", &ps_script])
        .output()?;

    if output.status.success() {
        let stdout_str = String::from_utf8_lossy(&output.stdout);
        let base64_data = stdout_str.trim();
        if !base64_data.is_empty() {
            let icon_data = base64::engine::general_purpose::STANDARD.decode(base64_data)?;
            return Ok(Some(AppIcon {
                data: icon_data,
                format: "png".to_string(),
            }));
        }
    }

    // Fallback: try to read a default icon
    let default_icon_path = format!("C:\\Windows\\System32\\{}.exe", app_name);
    if Path::new(&default_icon_path).exists() {
        let mut file = File::open(default_icon_path)?;
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer)?;
        
        // This is a simplified approach - in practice you'd need proper PE parsing
        return Ok(Some(AppIcon {
            data: buffer,
            format: "exe".to_string(),
        }));
    }

    Ok(None)
}

#[cfg(target_os = "macos")]
async fn get_macos_app_icon(app_name: &str, app_path: Option<&str>) -> Result<Option<AppIcon>> {
    use std::process::Command;
    
    // Try to find the app bundle
    let app_bundle_path = if let Some(path) = app_path {
        path.to_string()
    } else {
        // Common locations for macOS apps
        let common_paths = vec![
            format!("/Applications/{}.app", app_name),
            format!("/Applications/{}.app", app_name.replace(" ", "")),
            format!("/System/Applications/{}.app", app_name),
        ];
        
        let mut found_path = None;
        for path in common_paths {
            if Path::new(&path).exists() {
                found_path = Some(path);
                break;
            }
        }
        
        found_path.ok_or_else(|| anyhow::anyhow!("Could not find app bundle for {}", app_name))?
    };

    // Use sips to extract icon
    let icon_path = format!("{}/Contents/Resources/AppIcon.icns", app_bundle_path);
    
    if Path::new(&icon_path).exists() {
        // Convert ICNS to PNG using sips
        let output = Command::new("sips")
            .args(&["-s", "format", "png", "--out", "/tmp/temp_icon.png", &icon_path])
            .output()?;

        if output.status.success() {
            let icon_data = std::fs::read("/tmp/temp_icon.png")?;
            let _ = std::fs::remove_file("/tmp/temp_icon.png"); // Clean up
            
            return Ok(Some(AppIcon {
                data: icon_data,
                format: "png".to_string(),
            }));
        }
    }

    Ok(None)
}

#[cfg(target_os = "linux")]
async fn get_linux_app_icon(app_name: &str, _app_path: Option<&str>) -> Result<Option<AppIcon>> {
    use std::process::Command;
    
    // Try to find icon in common locations
    let icon_paths = vec![
        format!("/usr/share/icons/hicolor/256x256/apps/{}.png", app_name),
        format!("/usr/share/icons/hicolor/128x128/apps/{}.png", app_name),
        format!("/usr/share/icons/hicolor/64x64/apps/{}.png", app_name),
        format!("/usr/share/icons/hicolor/48x48/apps/{}.png", app_name),
        format!("/usr/share/pixmaps/{}.png", app_name),
        format!("/usr/share/pixmaps/{}.xpm", app_name),
    ];

    for icon_path in icon_paths {
        if Path::new(&icon_path).exists() {
            let icon_data = std::fs::read(&icon_path)?;
            let format = if icon_path.ends_with(".png") { "png" } else { "xpm" };
            
            return Ok(Some(AppIcon {
                data: icon_data,
                format: format.to_string(),
            }));
        }
    }

    // Try to find desktop file and extract icon from it
    let desktop_paths = vec![
        format!("/usr/share/applications/{}.desktop", app_name),
        format!("/usr/local/share/applications/{}.desktop", app_name),
        format!("{}/.local/share/applications/{}.desktop", 
               std::env::var("HOME").unwrap_or_default(), app_name),
    ];

    for desktop_path in desktop_paths {
        if Path::new(&desktop_path).exists() {
            if let Ok(content) = std::fs::read_to_string(&desktop_path) {
                for line in content.lines() {
                    if line.starts_with("Icon=") {
                        let icon_name = line[5..].trim();
                        // Try to find the icon file
                        let icon_file_paths = vec![
                            format!("/usr/share/icons/hicolor/256x256/apps/{}.png", icon_name),
                            format!("/usr/share/icons/hicolor/128x128/apps/{}.png", icon_name),
                            format!("/usr/share/pixmaps/{}.png", icon_name),
                        ];
                        
                        for icon_file_path in icon_file_paths {
                            if Path::new(&icon_file_path).exists() {
                                let icon_data = std::fs::read(&icon_file_path)?;
                                return Ok(Some(AppIcon {
                                    data: icon_data,
                                    format: "png".to_string(),
                                }));
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(None)
} 