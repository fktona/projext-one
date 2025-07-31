use std::collections::HashMap;
use std::path::Path;
use std::process::Command;
use std::time::Instant;
use std::fs;
use crate::types::{SystemApp, AppDiscoveryResult, AppSearchResult, AppCategory};

pub struct AppDiscovery {
    system_apps: Vec<SystemApp>,
    user_apps: Vec<SystemApp>,
    running_apps: Vec<SystemApp>,
    categories: HashMap<String, Vec<SystemApp>>,
}

impl AppDiscovery {
    pub fn new() -> Self {
        Self {
            system_apps: Vec::new(),
            user_apps: Vec::new(),
            running_apps: Vec::new(),
            categories: HashMap::new(),
        }
    }

    /// Discover all applications on the system
    pub fn discover_all_apps() -> AppDiscoveryResult {
        let start_time = Instant::now();
        let mut discovery = AppDiscovery::new();
        let mut errors = Vec::new();

        // Discover apps based on platform
        let platform_result = if cfg!(target_os = "windows") {
            discovery.discover_windows_apps()
        } else if cfg!(target_os = "macos") {
            discovery.discover_windows_apps() // Fallback to Windows method for now
        } else {
            discovery.discover_windows_apps() // Fallback to Windows method for now
        };

        if let Err(e) = platform_result {
            errors.push(format!("Platform discovery failed: {}", e));
        }

        // Get running processes
        let running_result = discovery.get_running_processes();
        if let Err(e) = running_result {
            errors.push(format!("Running processes discovery failed: {}", e));
        }

        // Categorize apps
        discovery.categorize_apps();

        let scan_time = start_time.elapsed().as_millis() as u64;

        AppDiscoveryResult {
            total_apps: discovery.system_apps.len() + discovery.user_apps.len(),
            system_apps: discovery.system_apps,
            user_apps: discovery.user_apps,
            running_apps: discovery.running_apps,
            categories: discovery.categories.keys().cloned().collect(),
            scan_time_ms: scan_time,
            errors,
        }
    }

    /// Search for apps by name or description
    pub fn search_apps(query: &str) -> AppSearchResult {
        let start_time = Instant::now();
        let discovery_result = Self::discover_all_apps();
        
        let all_apps: Vec<&SystemApp> = discovery_result.system_apps.iter()
            .chain(discovery_result.user_apps.iter())
            .collect();
        
        let query_lower = query.to_lowercase();
        let results: Vec<SystemApp> = all_apps
            .into_iter()
            .filter(|app| {
                app.name.to_lowercase().contains(&query_lower) ||
                app.display_name.as_ref().map_or(false, |name| 
                    name.to_lowercase().contains(&query_lower)
                ) ||
                app.description.as_ref().map_or(false, |desc| 
                    desc.to_lowercase().contains(&query_lower)
                )
            })
            .cloned()
            .collect();

        let search_time = start_time.elapsed().as_millis() as u64;

        let total_found = results.len();
        AppSearchResult {
            query: query.to_string(),
            results,
            total_found,
            search_time_ms: search_time,
        }
    }

    /// Get apps by category
    pub fn get_apps_by_category(category: &str) -> AppCategory {
        let discovery_result = Self::discover_all_apps();
        let all_apps: Vec<&SystemApp> = discovery_result.system_apps.iter()
            .chain(discovery_result.user_apps.iter())
            .collect();
        
        let category_apps: Vec<SystemApp> = all_apps
            .into_iter()
            .filter(|app| app.category.as_ref().map_or(false, |cat| cat == category))
            .cloned()
            .collect();

        AppCategory {
            name: category.to_string(),
            count: category_apps.len(),
            apps: category_apps,
        }
    }

    /// Discover Windows applications
    #[cfg(target_os = "windows")]
    fn discover_windows_apps(&mut self) -> Result<(), String> {
        // Registry-based discovery
        self.discover_windows_registry_apps()?;
        
        // Program Files discovery
        self.discover_windows_program_files()?;
        
        // User profile discovery
        self.discover_windows_user_apps()?;
        
        Ok(())
    }

    #[cfg(target_os = "windows")]
    fn discover_windows_registry_apps(&mut self) -> Result<(), String> {
        let registry_paths = vec![
            r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
            r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall",
        ];

        for path in registry_paths {
            let output = Command::new("reg")
                .args(&["query", path, "/s"])
                .output()
                .map_err(|e| format!("Registry query failed: {}", e))?;

            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                println!("Registry output for {}: {} bytes", path, stdout.len());
                if stdout.len() > 1000 {
                    println!("First 1000 chars: {}", &stdout[..1000.min(stdout.len())]);
                }
                self.parse_windows_registry_output(&stdout);
            } else {
                println!("Registry query failed for {}: {:?}", path, output.status);
            }
        }

        println!("Total apps found: {} system, {} user", self.system_apps.len(), self.user_apps.len());
        Ok(())
    }

    #[cfg(target_os = "windows")]
    fn parse_windows_registry_output(&mut self, output: &str) {
        let mut current_app: Option<SystemApp> = None;
        
        for line in output.lines() {
            let line = line.trim();
            
            if line.starts_with("HKEY_") {
                // Save previous app if exists
                if let Some(app) = current_app.take() {
                    if !app.name.is_empty() && app.display_name.is_some() {
                        self.add_app(app);
                    }
                }
                
                // Extract app name from registry key
                if let Some(name) = line.split('\\').last() {
                    current_app = Some(SystemApp {
                        name: name.to_string(),
                        display_name: None,
                        executable_path: None,
                        icon_path: None,
                        version: None,
                        description: None,
                        category: None,
                        is_system_app: false,
                        is_running: false,
                        install_date: None,
                        publisher: None,
                        size: None,
                    });
                }
            } else if let Some(ref mut app) = current_app {
                // Parse registry values - handle different formats
                if line.contains("DisplayName") {
                    if line.contains("REG_SZ") {
                        if let Some(value) = line.split("REG_SZ").nth(1) {
                            let clean_value = value.trim().trim_matches('"');
                            if !clean_value.is_empty() {
                                app.display_name = Some(clean_value.to_string());
                            }
                        }
                    } else if line.contains("REG_EXPAND_SZ") {
                        if let Some(value) = line.split("REG_EXPAND_SZ").nth(1) {
                            let clean_value = value.trim().trim_matches('"');
                            if !clean_value.is_empty() {
                                app.display_name = Some(clean_value.to_string());
                            }
                        }
                    }
                } else if line.contains("DisplayVersion") {
                    if line.contains("REG_SZ") {
                        if let Some(value) = line.split("REG_SZ").nth(1) {
                            let clean_value = value.trim().trim_matches('"');
                            if !clean_value.is_empty() {
                                app.version = Some(clean_value.to_string());
                            }
                        }
                    }
                } else if line.contains("Publisher") {
                    if line.contains("REG_SZ") {
                        if let Some(value) = line.split("REG_SZ").nth(1) {
                            let clean_value = value.trim().trim_matches('"');
                            if !clean_value.is_empty() {
                                app.publisher = Some(clean_value.to_string());
                            }
                        }
                    }
                } else if line.contains("InstallLocation") {
                    if line.contains("REG_SZ") {
                        if let Some(value) = line.split("REG_SZ").nth(1) {
                            let clean_value = value.trim().trim_matches('"');
                            if !clean_value.is_empty() {
                                app.executable_path = Some(clean_value.to_string());
                            }
                        }
                    } else if line.contains("REG_EXPAND_SZ") {
                        if let Some(value) = line.split("REG_EXPAND_SZ").nth(1) {
                            let clean_value = value.trim().trim_matches('"');
                            if !clean_value.is_empty() {
                                app.executable_path = Some(clean_value.to_string());
                            }
                        }
                    }
                } else if line.contains("UninstallString") {
                    if line.contains("REG_SZ") {
                        if let Some(value) = line.split("REG_SZ").nth(1) {
                            let clean_value = value.trim().trim_matches('"');
                            if !clean_value.is_empty() && app.executable_path.is_none() {
                                // Use uninstall string as fallback for executable path
                                app.executable_path = Some(clean_value.to_string());
                            }
                        }
                    } else if line.contains("REG_EXPAND_SZ") {
                        if let Some(value) = line.split("REG_EXPAND_SZ").nth(1) {
                            let clean_value = value.trim().trim_matches('"');
                            if !clean_value.is_empty() && app.executable_path.is_none() {
                                app.executable_path = Some(clean_value.to_string());
                            }
                        }
                    }
                }
            }
        }
        
        // Add the last app
        if let Some(app) = current_app {
            if !app.name.is_empty() && app.display_name.is_some() {
                self.add_app(app);
            }
        }
    }

    #[cfg(target_os = "windows")]
    fn discover_windows_program_files(&mut self) -> Result<(), String> {
        let program_dirs = vec![
            r"C:\Program Files",
            r"C:\Program Files (x86)",
        ];

        for dir in program_dirs {
            if let Ok(entries) = fs::read_dir(dir) {
                for entry in entries {
                    if let Ok(entry) = entry {
                        let path = entry.path();
                        if path.is_dir() {
                            self.scan_directory_for_executables(&path, true);
                        }
                    }
                }
            }
        }

        Ok(())
    }

    #[cfg(target_os = "windows")]
    fn discover_windows_user_apps(&mut self) -> Result<(), String> {
        // Check common user app locations
        let user_dirs = vec![
            format!("{}\\AppData\\Local", std::env::var("USERPROFILE").unwrap_or_default()),
            format!("{}\\AppData\\Roaming", std::env::var("USERPROFILE").unwrap_or_default()),
        ];

        for dir in user_dirs {
            if let Ok(entries) = fs::read_dir(dir) {
                for entry in entries {
                    if let Ok(entry) = entry {
                        let path = entry.path();
                        if path.is_dir() {
                            self.scan_directory_for_executables(&path, false);
                        }
                    }
                }
            }
        }

        Ok(())
    }

    /// Scan directory for executable files
    fn scan_directory_for_executables(&mut self, dir_path: &Path, is_system: bool) {
        if let Ok(entries) = fs::read_dir(dir_path) {
            for entry in entries {
                if let Ok(entry) = entry {
                    let path = entry.path();
                    if path.is_file() && self.is_executable(&path) {
                        if let Some(name) = path.file_stem() {
                            let app_name = name.to_string_lossy().to_string();
                            
                            // Skip if we already have this app from registry
                            if !self.app_exists(&app_name) {
                                let app = SystemApp {
                                    name: app_name.clone(),
                                    display_name: Some(app_name),
                                    executable_path: Some(path.to_string_lossy().to_string()),
                                    icon_path: None,
                                    version: None,
                                    description: None,
                                    category: None,
                                    is_system_app: is_system,
                                    is_running: false,
                                    install_date: None,
                                    publisher: None,
                                    size: None,
                                };
                                
                                self.add_app(app);
                            }
                        }
                    }
                }
            }
        }
    }

    /// Check if an app already exists in our collections
    fn app_exists(&self, app_name: &str) -> bool {
        let name_lower = app_name.to_lowercase();
        
        self.system_apps.iter().any(|app| {
            app.name.to_lowercase() == name_lower ||
            app.display_name.as_ref().map_or(false, |name| name.to_lowercase() == name_lower)
        }) ||
        self.user_apps.iter().any(|app| {
            app.name.to_lowercase() == name_lower ||
            app.display_name.as_ref().map_or(false, |name| name.to_lowercase() == name_lower)
        })
    }

    /// Check if a file is executable
    fn is_executable(&self, path: &Path) -> bool {
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            if let Ok(metadata) = fs::metadata(path) {
                let permissions = metadata.permissions();
                permissions.mode() & 0o111 != 0
            } else {
                false
            }
        }
        
        #[cfg(windows)]
        {
            if let Some(extension) = path.extension() {
                matches!(extension.to_str(), Some("exe") | Some("com") | Some("bat") | Some("cmd"))
            } else {
                false
            }
        }
    }

    /// Get running processes
    fn get_running_processes(&mut self) -> Result<(), String> {
        self.get_windows_running_processes()
    }

    fn get_windows_running_processes(&mut self) -> Result<(), String> {
        let output = Command::new("tasklist")
            .arg("/FO")
            .arg("CSV")
            .output()
            .map_err(|e| format!("Failed to get running processes: {}", e))?;

        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines().skip(1) {
                let parts: Vec<&str> = line.split(',').collect();
                if parts.len() >= 1 {
                    let process_name = parts[0].trim_matches('"');
                    let app = SystemApp {
                        name: process_name.to_string(),
                        display_name: Some(process_name.to_string()),
                        executable_path: None,
                        icon_path: None,
                        version: None,
                        description: None,
                        category: Some("Running Process".to_string()),
                        is_system_app: false,
                        is_running: true,
                        install_date: None,
                        publisher: None,
                        size: None,
                    };
                    
                    self.running_apps.push(app);
                }
            }
        }

        Ok(())
    }

    /// Add an app to the appropriate collection
    fn add_app(&mut self, app: SystemApp) {
        // Determine if it's a system app based on various criteria
        let is_system = self.is_system_app(&app);
        
        let mut app_with_correct_type = app;
        app_with_correct_type.is_system_app = is_system;
        
        if is_system {
            self.system_apps.push(app_with_correct_type);
        } else {
            self.user_apps.push(app_with_correct_type);
        }
    }

    /// Determine if an app is a system app
    fn is_system_app(&self, app: &SystemApp) -> bool {
        // Check if it's already marked as system
        if app.is_system_app {
            return true;
        }
        
        // Check executable path for system indicators
        if let Some(ref exec_path) = app.executable_path {
            let path_lower = exec_path.to_lowercase();
            
            // System directories
            if path_lower.contains("\\windows\\") ||
               path_lower.contains("\\program files\\") ||
               path_lower.contains("\\system32\\") ||
               path_lower.contains("\\syswow64\\") {
                return true;
            }
        }
        
        // Check publisher for Microsoft/system publishers
        if let Some(ref publisher) = app.publisher {
            let publisher_lower = publisher.to_lowercase();
            if publisher_lower.contains("microsoft") ||
               publisher_lower.contains("windows") ||
               publisher_lower.contains("system") {
                return true;
            }
        }
        
        // Check name for system indicators
        let name_lower = app.name.to_lowercase();
        if name_lower.contains("windows") ||
           name_lower.contains("microsoft") ||
           name_lower.contains("system") ||
           name_lower.contains("update") ||
           name_lower.contains("security") {
            return true;
        }
        
        false
    }

    /// Categorize apps based on their properties
    fn categorize_apps(&mut self) {
        let all_apps: Vec<&SystemApp> = self.system_apps.iter()
            .chain(self.user_apps.iter())
            .collect();
        
        for app in all_apps {
            let category = self.determine_app_category(app);
            self.categories
                .entry(category)
                .or_insert_with(Vec::new)
                .push(app.clone());
        }
    }

    /// Determine the category of an app based on its properties
    fn determine_app_category(&self, app: &SystemApp) -> String {
        if app.is_running {
            return "Running Processes".to_string();
        }

        if let Some(ref category) = app.category {
            if !category.is_empty() {
                return category.clone();
            }
        }

        if let Some(ref exec_path) = app.executable_path {
            let path_lower = exec_path.to_lowercase();
            
            if path_lower.contains("microsoft") || path_lower.contains("office") {
                return "Office & Productivity".to_string();
            } else if path_lower.contains("chrome") || path_lower.contains("firefox") || path_lower.contains("browser") {
                return "Web Browsers".to_string();
            } else if path_lower.contains("game") || path_lower.contains("steam") || path_lower.contains("epic") {
                return "Games".to_string();
            } else if path_lower.contains("code") || path_lower.contains("studio") || path_lower.contains("ide") {
                return "Development Tools".to_string();
            } else if path_lower.contains("media") || path_lower.contains("video") || path_lower.contains("audio") {
                return "Media & Entertainment".to_string();
            } else if path_lower.contains("system") || path_lower.contains("windows") || path_lower.contains("control") {
                return "System Tools".to_string();
            }
        }

        if app.is_system_app {
            "System Applications".to_string()
        } else {
            "User Applications".to_string()
        }
    }
} 