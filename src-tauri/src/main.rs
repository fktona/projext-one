#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde_json;
use std::thread;
use tauri::{Emitter, Manager};

use base64::Engine;
use std::process::Command;

// Import modules
mod ai;
mod app_discovery;
mod export;
mod icons;
mod install;
mod rag;
mod screenpipe;
mod system;
mod types;

use ai::{call_ai_with_agent_async, prepare_ai_context_rag, TimeRange};
use app_discovery::AppDiscovery;
use export::{get_export_files, get_export_status};
use install::{install_ollama, install_ollama_model, install_screenpipe};

#[tauri::command]
fn ping() -> String {
    println!("🎯 Rust backend received a ping from the frontend!");
    "pong".to_string()
}

#[tauri::command]
fn get_ollama_models_cmd() -> Result<Vec<String>, String> {
    // Run Ollama models check in background thread to avoid blocking UI
    let (tx, rx) = std::sync::mpsc::channel();

    thread::spawn(move || {
        let result = system::get_ollama_models();
        let _ = tx.send(result);
    });

    // Wait for result with timeout to prevent hanging
    match rx.recv_timeout(std::time::Duration::from_secs(5)) {
        Ok(result) => Ok(result),
        Err(_) => Err("Ollama models check timed out".to_string()),
    }
}

#[tauri::command]
fn install_screenpipe_cmd() -> Result<String, String> {
    install_screenpipe()
}

#[tauri::command]
fn install_ollama_cmd(app_handle: tauri::AppHandle) -> Result<String, String> {
    install_ollama(&app_handle)
}

#[tauri::command]
fn install_ollama_model_cmd(model: String, app_handle: tauri::AppHandle) -> Result<String, String> {
    install_ollama_model(model, &app_handle)
}

#[tauri::command]
fn check_system_requirements_cmd() -> Result<types::SystemCheckResult, String> {
    // Run system check in background thread to avoid blocking UI
    let (tx, rx) = std::sync::mpsc::channel();

    thread::spawn(move || {
        let result = system::check_system_requirements_async();
        let _ = tx.send(result);
    });

    // Wait for result with timeout to prevent hanging
    match rx.recv_timeout(std::time::Duration::from_secs(10)) {
        Ok(result) => Ok(result),
        Err(_) => Err("System check timed out".to_string()),
    }
}

#[tauri::command]
fn start_background_export(
    _app_handle: tauri::AppHandle,
    _query: Option<serde_json::Value>,
) -> Result<String, String> {
    // Background export is currently disabled
    Ok("Background export is currently disabled".to_string())
}

#[tauri::command]
fn stop_background_export() -> Result<String, String> {
    // This would need a shared state to actually stop the loop
    // For now, just return success
    Ok("Background export stop requested".to_string())
}

#[tauri::command]
fn get_export_files_cmd() -> Result<Vec<serde_json::Value>, String> {
    get_export_files()
}

#[tauri::command]
async fn analyze_data_with_ai(
    app_handle: tauri::AppHandle,
    message: String,
    time_range: String, // "daily", "weekly", "monthly", "yearly", "all_time"
    agent_type: String,
) -> Result<String, String> {
    println!("Received AI analysis request");
    println!("Message: {}", message);
    println!("Time Range: {}", time_range);
    println!("Agent Type: {}", agent_type);

    // Convert string to TimeRange enum
    let time_range_enum =
        match time_range.as_str() {
            "daily" => TimeRange::Daily,
            "weekly" => TimeRange::Weekly,
            "monthly" => TimeRange::Monthly,
            "yearly" => TimeRange::Yearly,
            "all_time" => TimeRange::AllTime,
            _ => return Err(format!(
                "Invalid time range: {}. Must be one of: daily, weekly, monthly, yearly, all_time",
                time_range
            )),
        };

    // Perform AI analysis in a separate thread to avoid blocking
    let app_handle_clone = app_handle.clone();
    thread::spawn(move || {
        // Create a runtime for async operations in a separate thread
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap();

        rt.block_on(async {
            if let Err(e) =
                perform_ai_analysis(&app_handle_clone, message, time_range_enum, agent_type).await
            {
                let _ = app_handle_clone.emit(
                    "ai-response",
                    serde_json::json!({
                        "error": e
                    }),
                );
            }
        });
    });

    Ok("AI analysis started".to_string())
}

#[tauri::command]
fn set_openai_api_key(api_key: String) -> Result<String, String> {
    std::env::set_var("OPENAI_API_KEY", api_key);
    Ok("OpenAI API key set successfully".to_string())
}

#[tauri::command]
fn open_app_by_name(app_name: String) -> Result<String, String> {
    match app_name.as_str() {
        "Google Chrome" | "chrome" => {
            // Windows: 'start chrome', macOS: 'open -a "Google Chrome"', Linux: 'google-chrome'
            #[cfg(target_os = "windows")]
            {
                Command::new("cmd")
                    .args(["/C", "start", "chrome"])
                    .spawn()
                    .map_err(|e| format!("Failed to open Chrome: {}", e))?;
            }
            #[cfg(target_os = "macos")]
            {
                Command::new("open")
                    .args(["-a", "Google Chrome"])
                    .spawn()
                    .map_err(|e| format!("Failed to open Chrome: {}", e))?;
            }
            #[cfg(target_os = "linux")]
            {
                Command::new("google-chrome")
                    .spawn()
                    .map_err(|e| format!("Failed to open Chrome: {}", e))?;
            }
            Ok("Opened Google Chrome".to_string())
        }
        "VS Code" | "code" | "Visual Studio Code" => {
            #[cfg(target_os = "windows")]
            {
                Command::new("cmd")
                    .args(["/C", "start", "code"])
                    .spawn()
                    .map_err(|e| format!("Failed to open VS Code: {}", e))?;
            }
            #[cfg(target_os = "macos")]
            {
                Command::new("open")
                    .args(["-a", "Visual Studio Code"])
                    .spawn()
                    .map_err(|e| format!("Failed to open VS Code: {}", e))?;
            }
            #[cfg(target_os = "linux")]
            {
                Command::new("code")
                    .spawn()
                    .map_err(|e| format!("Failed to open VS Code: {}", e))?;
            }
            Ok("Opened VS Code".to_string())
        }
        _ => Err(format!("App '{}' is not supported yet.", app_name)),
    }
}

#[tauri::command]
fn get_video_file(filename: String) -> Result<Vec<u8>, String> {
    use std::fs;
    use std::path::PathBuf;
    let mut path = PathBuf::from("C:/Users/faith/.screenpipe/data/");
    path.push(filename);
    match fs::read(&path) {
        Ok(data) => Ok(data),
        Err(e) => Err(format!("Failed to read file: {}", e)),
    }
}

#[tauri::command]
fn start_screenpipe_cmd() -> Result<String, String> {
    match system::start_screenpipe() {
        Ok(true) => Ok("ScreenPipe started successfully".to_string()),
        Ok(false) => Err("ScreenPipe failed to start".to_string()),
        Err(e) => Err(e),
    }
}

#[tauri::command]
fn call_ollama_with_model_cmd(prompt: String, model: String) -> Result<String, String> {
    ai::call_ollama_with_model(&prompt, &model)
}

#[tauri::command]
fn check_ollama_status_cmd() -> Result<bool, String> {
    ai::check_ollama_status()
}

#[tauri::command]
fn set_selected_model_cmd(model: String) -> Result<String, String> {
    ai::set_selected_model(&model);
    Ok(format!("Model set to: {}", model))
}

#[tauri::command]
fn get_selected_model_cmd() -> Result<Option<String>, String> {
    Ok(ai::get_selected_model())
}

#[tauri::command]
fn clear_selected_model_cmd() -> Result<String, String> {
    ai::clear_selected_model();
    Ok("Selected model cleared".to_string())
}

async fn perform_ai_analysis(
    app_handle: &tauri::AppHandle,
    user_message: String,
    time_range: TimeRange,
    agent_type: String,
) -> Result<(), String> {
    println!("[AI] Starting AI analysis for time range: {:?}", time_range);
    println!("[AI] User message: {}", user_message);
    println!("[AI] Agent type: {}", agent_type);

    // Prepare context using RAG for intelligent content retrieval
    println!("[AI] Preparing RAG context...");
    println!("[AI] DEBUG: About to call prepare_ai_context_rag");
    let context = prepare_ai_context_rag(&user_message, time_range).await?;
    println!("[AI] DEBUG: prepare_ai_context_rag completed successfully");
    println!("[AI] RAG context prepared successfully");

    let prompt = format!(
        r#"You are an assistant secretary. When answering, provide polished, professional summaries and responses as if you are briefing an executive. Do not reference how you know the information, the user, or any context or data source. Simply present the information as a knowledgeable assistant secretary would, focusing on clarity, professionalism, and helpfulness.

If asked for a summary of activities, list the applications, tasks, or events in a clear and concise manner. If asked for details, provide them directly and succinctly. If information is not available, state so politely and professionally.

Always use clear, concise, and formal language. Do not mention 'context', 'user', or how the answer was derived.

SUMMARY DATA:
{context}

QUESTION:
{user_message}
"#
    );

    println!("[AI] Calling AI with agent-specific analysis...");
    println!("[AI] DEBUG: About to call call_ai_with_agent_async");
    // Call AI with agent-specific analysis
    let ai_response = call_ai_with_agent_async(&prompt, &agent_type).await?;
    println!("[AI] DEBUG: call_ai_with_agent_async completed successfully");
    println!("[AI] AI response received successfully");

    // Print AI analysis to terminal
    println!("=== AI ANALYSIS RESULT ===");
    println!("Agent Type: {}", agent_type);
    println!("User Message: {}", user_message);
    println!("AI Response:");
    println!("{}", ai_response);
    println!("==========================");

    // Send response back to frontend
    println!("[AI] Sending response to frontend...");
    app_handle
        .emit(
            "ai-response",
            serde_json::json!({
                "message": ai_response
            }),
        )
        .map_err(|e| format!("Failed to emit AI response: {}", e))?;

    println!("[AI] AI analysis completed and sent to frontend");
    Ok(())
}

#[tauri::command]
async fn get_app_icon_handler(
    app_name: String,
    app_path: Option<String>,
) -> Result<serde_json::Value, String> {
    println!(
        "Received app icon request: app_name={:?}, app_path={:?}",
        app_name, app_path
    );

    #[cfg(any(target_os = "macos", target_os = "windows", target_os = "linux"))]
    {
        match icons::get_app_icon(&app_name, app_path.as_deref()).await {
            Ok(Some(icon)) => {
                let base64_data = base64::engine::general_purpose::STANDARD.encode(&icon.data);
                Ok(serde_json::json!({
                    "success": true,
                    "data": base64_data,
                    "format": icon.format
                }))
            }
            Ok(None) => {
                println!("Icon not found for app: {}", app_name);
                Ok(serde_json::json!({
                    "success": false,
                    "error": "Icon not found"
                }))
            }
            Err(e) => {
                println!("Failed to get app icon: {}", e);
                Err(format!("Failed to get app icon: {}", e))
            }
        }
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        Err("App icon retrieval not supported on this platform".to_string())
    }
}

// RAG Command Functions
#[tauri::command]
async fn initialize_rag_cmd() -> Result<String, String> {
    match rag::initialize_rag().await {
        Ok(result) => Ok(result),
        Err(e) => Err(format!("Failed to initialize RAG: {}", e)),
    }
}

#[tauri::command]
async fn ingest_data_rag_cmd(data_files: Vec<serde_json::Value>) -> Result<String, String> {
    match rag::ingest_data_rag(data_files).await {
        Ok(result) => Ok(result),
        Err(e) => Err(format!("Failed to ingest data: {}", e)),
    }
}

#[tauri::command]
async fn query_rag_system_cmd(
    query: String,
    top_k: Option<usize>,
    similarity_threshold: Option<f32>,
    custom_query: Option<String>,
    time_range: Option<String>,
) -> Result<serde_json::Value, String> {
    match rag::query_rag_system(query, top_k, similarity_threshold, custom_query, time_range).await
    {
        Ok(response) => {
            let json_response = serde_json::to_value(response)
                .map_err(|e| format!("Failed to serialize RAG response: {}", e))?;
            Ok(json_response)
        }
        Err(e) => Err(format!("Failed to query RAG system: {}", e)),
    }
}

#[tauri::command]
async fn clear_rag_data_cmd() -> Result<String, String> {
    match rag::clear_rag_data().await {
        Ok(result) => Ok(result),
        Err(e) => Err(format!("Failed to clear RAG data: {}", e)),
    }
}

#[tauri::command]
async fn get_rag_stats_cmd() -> Result<serde_json::Value, String> {
    match rag::get_rag_stats().await {
        Ok(stats) => {
            let json_stats = serde_json::to_value(stats)
                .map_err(|e| format!("Failed to serialize RAG stats: {}", e))?;
            Ok(json_stats)
        }
        Err(e) => Err(format!("Failed to get RAG stats: {}", e)),
    }
}

#[tauri::command]
async fn ingest_sql_data_rag(
    time_range: Option<String>,
    sql_query: Option<String>,
) -> Result<String, String> {
    match rag::ingest_sql_data_rag(time_range, sql_query).await {
        Ok(result) => Ok(result),
        Err(e) => Err(format!("Failed to ingest SQL data: {}", e)),
    }
}

#[tauri::command]
async fn deep_analysis_rag(
    sql_query: String,
    analysis_query: String,
    top_k: Option<usize>,
    similarity_threshold: Option<f32>,
) -> Result<String, String> {
    // First, initialize RAG system
    match rag::initialize_rag().await {
        Ok(_) => (),
        Err(e) => return Err(format!("Failed to initialize RAG: {}", e)),
    }

    // Clear existing data and ingest new data
    match rag::clear_rag_data().await {
        Ok(_) => (),
        Err(e) => return Err(format!("Failed to clear RAG data: {}", e)),
    }

    // Ingest the SQL data into RAG system
    match rag::ingest_sql_data_rag(Some(sql_query), None).await {
        Ok(_) => (),
        Err(e) => return Err(format!("Failed to ingest SQL data: {}", e)),
    }

    // Query the RAG system for analysis
    let top_k = top_k.unwrap_or(10);
    let similarity_threshold = similarity_threshold.unwrap_or(0.3);

    match rag::query_rag_system(
        analysis_query,
        Some(top_k),
        Some(similarity_threshold),
        None,
        None,
    )
    .await
    {
        Ok(response) => {
            // Serialize the RAGResponse to JSON string for the frontend
            serde_json::to_string(&response)
                .map_err(|e| format!("Failed to serialize RAG response: {}", e))
        }
        Err(e) => Err(format!("Failed to query RAG system: {}", e)),
    }
}

#[tauri::command]
async fn pure_rust_analysis(
    start_time: Option<String>,
    end_time: Option<String>,
) -> Result<String, String> {
    let time_range = if let (Some(start), Some(end)) = (start_time, end_time) {
        Some((start, end))
    } else {
        None
    };

    match rag::perform_pure_rust_analysis(time_range).await {
        Ok(analysis) => Ok(analysis),
        Err(e) => Err(format!("Failed to perform pure Rust analysis: {}", e)),
    }
}

#[tauri::command]
async fn quick_action_rag(
    action_type: String,
    time_range: String,
    custom_prompt: Option<String>,
) -> Result<String, String> {
    println!("=== QUICK ACTION RAG DEBUG ===");
    println!("Action Type: {}", action_type);
    println!("Time Range: {}", time_range);
    println!("Custom Prompt: {:?}", custom_prompt);

    // Initialize RAG system
    match rag::initialize_rag().await {
        Ok(_) => println!("RAG system initialized successfully"),
        Err(e) => return Err(format!("Failed to initialize RAG: {}", e)),
    }

    // Clear existing data
    match rag::clear_rag_data().await {
        Ok(_) => println!("RAG data cleared successfully"),
        Err(e) => return Err(format!("Failed to clear RAG data: {}", e)),
    }

    // Build SQL query based on time range
    let sql_query = time_range.clone();

    println!("Final SQL Query:");
    println!("{}", sql_query);
    println!("=== END DEBUG ===");

    // Ingest the SQL data into RAG system
    match rag::ingest_sql_data_rag(Some(sql_query), None).await {
        Ok(_) => (),
        Err(e) => return Err(format!("Failed to ingest SQL data: {}", e)),
    }

    // Build analysis query based on action type with time range context
    let analysis_query = match action_type.as_str() {
        "meeting_analysis" => format!("Analyze all meeting activities for the time period: {}. Look for meeting durations, participants, topics discussed, and any important decisions or action items from meetings.", time_range),
        "coding_activity" => format!("Analyze all coding and development activities for the time period: {}. Look for programming languages used, development tools, code repositories, debugging sessions, and any technical work or problem-solving activities.", time_range),
        "productivity_analysis" => format!("Analyze overall productivity patterns for the time period: {}. Look for focused work sessions, application usage patterns, task switching frequency, and identify the most productive periods and activities.", time_range),
        "communication_analysis" => format!("Analyze all communication activities for the time period: {}. Look for emails, chat messages, social media, and messaging platforms. Look for important conversations, communication patterns, and any urgent or significant messages.", time_range),
        "research_analysis" => format!("Analyze research and learning activities for the time period: {}. Look for documentation reading, tutorial watching, educational content consumption, and any research or learning-related activities.", time_range),
        "web_browsing" => format!("Analyze web browsing patterns and activities for the time period: {}. Look for websites visited, browsing purposes, research activities, and any important information gathered from web browsing.", time_range),
        "time_usage" => format!("Analyze time usage patterns for the time period: {}. Provide insights into how time was distributed, most time-consuming activities, and efficiency patterns.", time_range),
        "daily_analysis" => format!("Provide a comprehensive activity analysis for the time period: {}. Cover all digital activities, productivity patterns, important events, and give a complete overview of the digital footprint.", time_range),
        "statistical_analysis" => format!("Provide statistical analysis of digital activities for the time period: {}. Include application usage statistics, time distribution, activity patterns, and quantitative insights about digital behavior.", time_range),
        "past_hour" => format!("Analyze all digital activity for the time period: {}. Look for applications used, websites visited, communication activities, work tasks, and any important actions or decisions made.", time_range),
        "github_activity" => format!("Analyze GitHub activities for the time period: {}. Look for repositories accessed, code commits, pull requests, issues, and any development work related to GitHub and version control.", time_range),
        "slack_activity" => format!("Analyze Slack activities for the time period: {}. Look for channels accessed, messages sent/received, file sharing, and any important communications or collaborations in Slack.", time_range),
        "discord_activity" => format!("Analyze Discord activities for the time period: {}. Look for servers accessed, channels used, messages sent/received, voice chat participation, and any gaming or community activities.", time_range),
        "gitlab_activity" => format!("Analyze GitLab activities for the time period: {}. Look for repositories accessed, merge requests, issues, CI/CD activities, and any development work related to GitLab.", time_range),
        "app_usage" => format!("Analyze application usage patterns for the time period: {}. Look for most used applications, time spent in each app, application switching patterns, and productivity insights based on app usage.", time_range),
        "audio_files" => format!("Analyze audio recordings and transcriptions for the time period: {}. Look for conversations, meetings, voice notes, and any important audio content that was captured.", time_range),
        "search_for_text" => format!("Search for and analyze all content for the time period: {}. Look for mentions, discussions, and related activities across all applications and websites.", time_range),
        "screenshots_with_text" => format!("Find and analyze all screenshots and visual content for the time period: {}. Look for context, applications used, and related activities.", time_range),
        "this_week_activity" => format!("Analyze all activity for the time period: {}. Provide a comprehensive overview of work patterns, productivity, communication, and key accomplishments across all applications and websites.", time_range),
        "custom" => {
            if let Some(prompt) = custom_prompt {
                // Remove technical time range info from user-facing prompt
                prompt.to_string()
            } else {
                "Analyze the digital activity data and provide insights about productivity, activities, and patterns. If no context or data is available, inform the user that no digital activity was recorded for the specified time period.".to_string()
            }
        },
        _ => {
            if let Some(prompt) = custom_prompt {
                // Remove technical time range info from user-facing prompt
                prompt.to_string()
            } else {
                "Analyze the digital activity data and provide insights about productivity, activities, and patterns. If no context or data is available, inform the user that no digital activity was recorded for the specified time period.".to_string()
            }
        }
    };

    // Query the RAG system for analysis
    match rag::query_rag_system(analysis_query.to_string(), Some(10), Some(0.1), None, None).await {
        Ok(response) => {
            // Return just the answer from the RAG response
            Ok(response.answer)
        }
        Err(e) => Err(format!("Failed to query RAG system: {}", e)),
    }
}

#[tauri::command]
async fn discover_system_apps() -> Result<crate::types::AppDiscoveryResult, String> {
    // Discover all applications on the system
    let result = AppDiscovery::discover_all_apps();
    Ok(result)
}

#[tauri::command]
async fn search_system_apps(query: String) -> Result<crate::types::AppSearchResult, String> {
    // Search for applications by name or description
    let result = AppDiscovery::search_apps(&query);
    Ok(result)
}

#[tauri::command]
async fn get_apps_by_category(category: String) -> Result<crate::types::AppCategory, String> {
    // Get applications by category
    let result = AppDiscovery::get_apps_by_category(&category);
    Ok(result)
}

#[tauri::command]
async fn get_running_apps() -> Result<Vec<crate::types::SystemApp>, String> {
    // Get currently running applications
    let discovery_result = AppDiscovery::discover_all_apps();
    Ok(discovery_result.running_apps)
}

#[tauri::command]
async fn get_app_categories() -> Result<Vec<String>, String> {
    // Get all available app categories
    let discovery_result = AppDiscovery::discover_all_apps();
    Ok(discovery_result.categories)
}

// System tray setup function


#[tauri::command]
async fn check_for_updates() -> Result<serde_json::Value, String> {
    // This is a placeholder for manual update checking
    // The actual update checking is handled by the frontend
    Ok(serde_json::json!({
        "status": "checking",
        "message": "Update check initiated"
    }))
}

#[tauri::command]
async fn get_deep_app_usage_analytics(time_range: String) -> Result<serde_json::Value, String> {
    // Convert time range string to TimeRange enum
    let time_range_enum = match time_range.as_str() {
        "daily" => TimeRange::Daily,
        "weekly" => TimeRange::Weekly,
        "monthly" => TimeRange::Monthly,
        "yearly" => TimeRange::Yearly,
        "all_time" => TimeRange::AllTime,
        _ => {
            return Err(
                "Invalid time range. Use: daily, weekly, monthly, yearly, all_time".to_string(),
            )
        }
    };

    // Build comprehensive SQL query for app usage analytics
    let time_filter = time_range_enum.to_sql_filter();
    let query = format!(
        r#"
        WITH frame_durations AS (
            SELECT 
                f.*,
                CASE 
                    WHEN f.focused = 1 THEN 
                        COALESCE(
                            (julianday(LEAD(f.timestamp) OVER (PARTITION BY f.app_name ORDER BY f.timestamp)) - julianday(f.timestamp)) * 24 * 60 * 60 * 1000,
                            30000  -- Default 30 seconds if no next frame
                        )
                    ELSE 0
                END as calculated_duration_ms
            FROM frames f 
            WHERE {} AND f.app_name IS NOT NULL AND f.app_name != ''
        ),
        app_usage_stats AS (
            SELECT 
                fd.app_name,
                COUNT(*) as usage_count,
                COUNT(DISTINCT DATE(fd.timestamp)) as days_used,
                MIN(fd.timestamp) as first_used,
                MAX(fd.timestamp) as last_used,
                AVG(fd.calculated_duration_ms) as avg_duration_ms,
                SUM(fd.calculated_duration_ms) as total_duration_ms,
                COUNT(DISTINCT fd.window_name) as unique_windows,
                COUNT(DISTINCT DATE(fd.timestamp)) as active_days
            FROM frame_durations fd 
            GROUP BY fd.app_name
        ),
        app_categories AS (
            SELECT 
                app_name,
                CASE 
                    WHEN app_name LIKE '%chrome%' OR app_name LIKE '%firefox%' OR app_name LIKE '%edge%' OR app_name LIKE '%safari%' THEN 'Browser'
                    WHEN app_name LIKE '%code%' OR app_name LIKE '%vs%' OR app_name LIKE '%studio%' OR app_name LIKE '%intellij%' OR app_name LIKE '%eclipse%' THEN 'Development'
                    WHEN app_name LIKE '%word%' OR app_name LIKE '%excel%' OR app_name LIKE '%powerpoint%' OR app_name LIKE '%notion%' OR app_name LIKE '%docs%' THEN 'Productivity'
                    WHEN app_name LIKE '%discord%' OR app_name LIKE '%slack%' OR app_name LIKE '%teams%' OR app_name LIKE '%zoom%' THEN 'Communication'
                    WHEN app_name LIKE '%spotify%' OR app_name LIKE '%youtube%' OR app_name LIKE '%netflix%' OR app_name LIKE '%twitch%' THEN 'Entertainment'
                    WHEN app_name LIKE '%photoshop%' OR app_name LIKE '%illustrator%' OR app_name LIKE '%figma%' OR app_name LIKE '%canva%' THEN 'Design'
                    WHEN app_name LIKE '%terminal%' OR app_name LIKE '%cmd%' OR app_name LIKE '%powershell%' OR app_name LIKE '%git%' THEN 'System'
                    ELSE 'Other'
                END as category
            FROM app_usage_stats
        ),
        hourly_usage AS (
            SELECT 
                fd.app_name,
                CAST(strftime('%H', fd.timestamp) AS INTEGER) as hour,
                COUNT(*) as usage_count
            FROM frame_durations fd 
            GROUP BY fd.app_name, hour
        ),
        daily_usage AS (
            SELECT 
                fd.app_name,
                DATE(fd.timestamp) as date,
                COUNT(*) as usage_count,
                SUM(fd.calculated_duration_ms) as total_duration_ms
            FROM frame_durations fd 
            GROUP BY fd.app_name, date
        )
        SELECT 
            aus.app_name,
            aus.usage_count,
            aus.days_used,
            aus.first_used,
            aus.last_used,
            aus.avg_duration_ms,
            aus.total_duration_ms,
            aus.unique_windows,
            aus.active_days,
            ac.category,
            (SELECT json_group_array(json_object('hour', hu.hour, 'count', hu.usage_count)) 
             FROM hourly_usage hu WHERE hu.app_name = aus.app_name) as hourly_pattern,
            (SELECT json_group_array(json_object('date', du.date, 'count', du.usage_count, 'duration', du.total_duration_ms)) 
             FROM daily_usage du WHERE du.app_name = aus.app_name ORDER BY du.date DESC LIMIT 30) as daily_pattern
        FROM app_usage_stats aus
        LEFT JOIN app_categories ac ON aus.app_name = ac.app_name
        ORDER BY aus.usage_count DESC, aus.total_duration_ms DESC
        LIMIT 100;
        "#,
        time_filter
    );

    // Execute the query
    let client = reqwest::Client::new();
    let response = client
        .post("http://localhost:3030/raw_sql")
        .header("Content-Type", "application/json")
        .timeout(std::time::Duration::from_secs(30))
        .json(&serde_json::json!({ "query": query }))
        .send()
        .await
        .map_err(|e| format!("Failed to send SQL query: {}", e))?;

    if !response.status().is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("SQL API error: {}", error_text));
    }

    let analytics_data: Vec<serde_json::Value> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse SQL response: {}", e))?;

    // Calculate summary statistics
    let total_apps = analytics_data.len();
    let total_events = analytics_data
        .iter()
        .map(|app| app["usage_count"].as_u64().unwrap_or(0))
        .sum::<u64>();
    let total_duration = analytics_data
        .iter()
        .map(|app| app["total_duration_ms"].as_f64().unwrap_or(0.0))
        .sum::<f64>();

    // Group by category
    let mut category_stats = std::collections::HashMap::new();
    for app in &analytics_data {
        let category = app["category"].as_str().unwrap_or("Other");
        let usage_count = app["usage_count"].as_u64().unwrap_or(0);
        let duration = app["total_duration_ms"].as_f64().unwrap_or(0.0);

        let entry = category_stats
            .entry(category)
            .or_insert((0, 0.0, Vec::new()));
        entry.0 += usage_count;
        entry.1 += duration;
        entry.2.push(app.clone());
    }

    // Convert to sorted vector
    let mut category_summary: Vec<serde_json::Value> = category_stats
        .iter()
        .map(|(category, (count, duration, apps))| {
            serde_json::json!({
                "category": category,
                "usage_count": count,
                "total_duration_ms": duration,
                "app_count": apps.len(),
                "apps": apps
            })
        })
        .collect();

    category_summary.sort_by(|a, b| {
        b["usage_count"]
            .as_u64()
            .unwrap_or(0)
            .cmp(&a["usage_count"].as_u64().unwrap_or(0))
    });

    let result = serde_json::json!({
        "time_range": time_range,
        "summary": {
            "total_apps": total_apps,
            "total_events": total_events,
            "total_duration_ms": total_duration,
            "most_used_app": analytics_data.first().map(|app| app["app_name"].as_str().unwrap_or("Unknown")).unwrap_or("None"),
            "most_used_count": analytics_data.first().map(|app| app["usage_count"].as_u64().unwrap_or(0)).unwrap_or(0)
        },
        "apps": analytics_data,
        "categories": category_summary
    });

    Ok(result)
}

fn main() {
    std::env::set_var("OPENAI_API_KEY", "");
    let context = tauri::generate_context!();

    // Add better error handling for WebView2 initialization
    match tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            ping,
            check_system_requirements_cmd,
            get_ollama_models_cmd,
            install_screenpipe_cmd,
            install_ollama_cmd,
            install_ollama_model_cmd,
            start_background_export,
            stop_background_export,
            get_export_files_cmd,
            get_export_status,
            analyze_data_with_ai,
            set_openai_api_key,
            open_app_by_name,
            get_video_file,
            start_screenpipe_cmd,
            call_ollama_with_model_cmd,
            check_ollama_status_cmd,
            set_selected_model_cmd,
            get_selected_model_cmd,
            clear_selected_model_cmd,
            get_app_icon_handler,
            // RAG commands
            initialize_rag_cmd,
            ingest_data_rag_cmd,
            query_rag_system_cmd,
            clear_rag_data_cmd,
            get_rag_stats_cmd,
            ingest_sql_data_rag,
            deep_analysis_rag,
            pure_rust_analysis,
            quick_action_rag,
            // App Discovery commands
            discover_system_apps,
            search_system_apps,
            get_apps_by_category,
            get_running_apps,
            get_app_categories,
            // Analytics commands
            get_deep_app_usage_analytics,
            // Update commands
            check_for_updates
        ])
        .setup(|app| {
            // Background export is currently disabled
            // let app_handle = app.handle();
            // thread::spawn(move || {
            //     background_export_loop(app_handle, None); // Initial call with default query
            // });

            // Set up window close behavior to hide instead of quit
            let window = app.get_webview_window("main").unwrap();
            let window_clone = window.clone();
            let _ = window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    window_clone.hide().unwrap();
                }
            });

            Ok(())
        })
        .run(context)
    {
        Ok(_) => println!("Tauri application exited successfully"),
        Err(e) => {
            eprintln!("Failed to run Tauri application: {}", e);
            eprintln!("This might be due to WebView2 installation issues.");
            eprintln!("Please ensure WebView2 Runtime is installed on your system.");
            eprintln!("You can download it from: https://developer.microsoft.com/en-us/microsoft-edge/webview2/");
            std::process::exit(1);
        }
    }
}
