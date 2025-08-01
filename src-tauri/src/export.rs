use crate::screenpipe::{
    fetch_screenpipe_data_with_offset, fetch_screenpipe_data_with_query_and_offset,
};
use crate::types::{ExportProgress, ExportState};
use serde_json;
use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Emitter;

pub fn get_desktop_path() -> Result<std::path::PathBuf, String> {
    #[cfg(target_os = "windows")]
    {
        let user_profile = std::env::var("USERPROFILE")
            .map_err(|_| "Failed to get USERPROFILE environment variable")?;
        Ok(Path::new(&user_profile).join("Desktop"))
    }

    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").map_err(|_| "Failed to get HOME environment variable")?;
        Ok(Path::new(&home).join("Desktop"))
    }

    #[cfg(target_os = "linux")]
    {
        let home = std::env::var("HOME").map_err(|_| "Failed to get HOME environment variable")?;
        Ok(Path::new(&home).join("Desktop"))
    }
}

pub fn get_state_file_path() -> Result<std::path::PathBuf, String> {
    let desktop_path = get_desktop_path()?;
    let export_dir = desktop_path.join("project one test");
    Ok(export_dir.join("export_state.json"))
}

pub fn load_export_state() -> ExportState {
    let state_path = match get_state_file_path() {
        Ok(path) => path,
        Err(_) => {
            return ExportState {
                last_offset: 0,
                total_items_known: 0,
                last_export_timestamp: 0,
                batch_number: 1,
                is_first_run: true,
            }
        }
    };

    if !state_path.exists() {
        return ExportState {
            last_offset: 0,
            total_items_known: 0,
            last_export_timestamp: 0,
            batch_number: 1,
            is_first_run: true,
        };
    }

    match fs::read_to_string(&state_path) {
        Ok(content) => match serde_json::from_str(&content) {
            Ok(state) => state,
            Err(_) => ExportState {
                last_offset: 0,
                total_items_known: 0,
                last_export_timestamp: 0,
                batch_number: 1,
                is_first_run: true,
            },
        },
        Err(_) => ExportState {
            last_offset: 0,
            total_items_known: 0,
            last_export_timestamp: 0,
            batch_number: 1,
            is_first_run: true,
        },
    }
}

pub fn save_export_state(state: &ExportState) -> Result<(), String> {
    let state_path = get_state_file_path()?;

    // Ensure directory exists
    if let Some(parent) = state_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create state directory: {}", e))?;
        }
    }

    let json_string = serde_json::to_string_pretty(state)
        .map_err(|e| format!("Failed to serialize state: {}", e))?;

    fs::write(&state_path, json_string)
        .map_err(|e| format!("Failed to write state file: {}", e))?;

    Ok(())
}

pub fn emit_progress(app_handle: &tauri::AppHandle, current: usize, total: usize, status: &str) {
    let progress = if total > 0 {
        (current as f64 / total as f64) * 100.0
    } else {
        0.0
    };
    let _ = app_handle.emit(
        "export-progress",
        serde_json::json!({
            "current": current,
            "total": total,
            "progress": progress,
            "status": status
        }),
    );
}

pub fn emit_export_progress(app_handle: &tauri::AppHandle, export_progress: &ExportProgress) {
    let progress_percentage = if export_progress.total_items > 0 {
        (export_progress.items_exported as f64 / export_progress.total_items as f64) * 100.0
    } else {
        0.0
    };

    let _ = app_handle.emit(
        "export-progress",
        serde_json::json!({
            "current": export_progress.items_exported,
            "total": export_progress.total_items,
            "progress": progress_percentage,
            "status": format!("Exporting batch {}: {}/{} items",
                export_progress.batch_number,
                export_progress.items_exported,
                export_progress.total_items
            ),
            "current_offset": export_progress.current_offset,
            "is_complete": export_progress.is_complete,
            "batch_number": export_progress.batch_number
        }),
    );
}

pub async fn perform_data_export(
    app_handle: &tauri::AppHandle,
    custom_query: Option<serde_json::Value>,
) -> Result<(), String> {
    let desktop_path = get_desktop_path()?;
    let export_dir = desktop_path.join("project one test");

    // Create export directory if it doesn't exist
    if !export_dir.exists() {
        fs::create_dir_all(&export_dir)
            .map_err(|e| format!("Failed to create export directory: {}", e))?;
    }

    // Load previous export state
    let mut export_state = load_export_state();
    let now = SystemTime::now();
    let current_timestamp = now.duration_since(UNIX_EPOCH).unwrap().as_secs();

    println!(
        "Starting export from offset: {}, batch: {}",
        export_state.last_offset, export_state.batch_number
    );

    // Initialize progress tracking
    let mut export_progress = ExportProgress {
        total_items: export_state.total_items_known,
        items_exported: export_state.last_offset,
        current_offset: export_state.last_offset,
        last_export_time: current_timestamp,
        is_complete: false,
        batch_number: export_state.batch_number,
    };

    emit_export_progress(app_handle, &export_progress);

    // Fetch data from ScreenPipe with offset
    let export_data = if let Some(query) = custom_query {
        emit_progress(app_handle, 10, 100, "Fetching data with custom query.....");
        fetch_screenpipe_data_with_query_and_offset(query, export_state.last_offset).await?
    } else {
        emit_progress(app_handle, 10, 100, "Fetching all data.....");
        fetch_screenpipe_data_with_offset(export_state.last_offset).await?
    };

    // Update total items if this is first run or if we got new total
    if export_state.is_first_run
        || export_data.metadata.total_items > export_state.total_items_known as usize
    {
        export_state.total_items_known = export_data.metadata.total_items as u64;
        export_progress.total_items = export_state.total_items_known;
    }

    // Update progress with new items
    let new_items_count = export_data.all.len() as u64;
    export_progress.items_exported += new_items_count;
    export_progress.current_offset = export_state.last_offset + new_items_count;

    emit_export_progress(app_handle, &export_progress);

    emit_progress(app_handle, 50, 100, "Processing data...");

    // Create batch data structure
    let batch_data = serde_json::json!({
        "batch_number": export_state.batch_number,
        "export_date": export_data.metadata.export_date,
        "total_items": export_data.metadata.total_items,
        "offset_start": export_state.last_offset,
        "offset_end": export_progress.current_offset,
        "ocr": export_data.ocr.iter().map(|item| serde_json::json!({
            "text": item.text,
            "app_name": item.app_name,
            "window_name": item.window_name,
            "timestamp": item.timestamp,
            "raw_content": item.raw_content
        })).collect::<Vec<_>>(),
        "audio": export_data.audio.iter().map(|item| serde_json::json!({
            "transcription": item.transcription,
            "speaker_id": item.speaker_id,
            "raw_content": item.raw_content
        })).collect::<Vec<_>>(),
        "ui_interactions": export_data.ui.iter().map(|item| serde_json::json!({
            "element_type": item.element_type,
            "raw_content": item.raw_content
        })).collect::<Vec<_>>(),
        "metadata": serde_json::json!({
            "export_date": export_data.metadata.export_date,
            "start_date": export_data.metadata.start_date,
            "end_date": export_data.metadata.end_date,
            "total_items": export_data.metadata.total_items
        })
    });

    emit_progress(app_handle, 80, 100, "Saving to file...");

    // Save to file
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let filename = format!(
        "screenpipe_export_batch_{}_{}.json",
        export_state.batch_number, timestamp
    );
    let file_path = export_dir.join(&filename);

    let json_string = serde_json::to_string_pretty(&batch_data)
        .map_err(|e| format!("Failed to serialize data: {}", e))?;

    fs::write(&file_path, json_string).map_err(|e| format!("Failed to write file: {}", e))?;

    // Debug: print the file path before saving
    println!("Saving export to: {}", file_path.display());

    // After saving, print all files in the export directory
    match fs::read_dir(&export_dir) {
        Ok(entries) => {
            println!("Files in export dir after save:");
            for entry in entries {
                if let Ok(entry) = entry {
                    println!("  {}", entry.path().display());
                }
            }
        }
        Err(e) => println!("Failed to read export dir: {}", e),
    }

    // Update export state
    export_state.last_offset = export_progress.current_offset;
    export_state.last_export_timestamp = current_timestamp;
    export_state.is_first_run = false;

    // Check if export is complete
    if export_progress.current_offset >= export_progress.total_items {
        export_progress.is_complete = true;
        export_state.batch_number += 1; // Start new batch
        export_state.last_offset = 0; // Reset offset for new batch
        emit_progress(
            app_handle,
            100,
            100,
            "Export completed! Starting new batch...",
        );
    } else {
        emit_progress(
            app_handle,
            100,
            100,
            "Batch completed! More data available...",
        );
    }

    // Save updated state
    save_export_state(&export_state)?;

    emit_export_progress(app_handle, &export_progress);

    // Emit completion event
    let _ = app_handle.emit(
        "export-complete",
        serde_json::json!({
            "file_path": file_path.to_string_lossy(),
            "total_items": export_data.metadata.total_items,
            "export_date": export_data.metadata.export_date,
            "items_exported": export_progress.items_exported,
            "total_items_known": export_progress.total_items,
            "current_offset": export_progress.current_offset,
            "is_complete": export_progress.is_complete,
            "batch_number": export_progress.batch_number
        }),
    );

    println!("Export completed: {}", file_path.display());
    println!(
        "Progress: {}/{} items exported (offset: {})",
        export_progress.items_exported, export_progress.total_items, export_progress.current_offset
    );
    Ok(())
}

#[tauri::command]
pub fn get_export_status() -> Result<ExportProgress, String> {
    let export_state = load_export_state();
    let _now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    Ok(ExportProgress {
        total_items: export_state.total_items_known,
        items_exported: export_state.last_offset,
        current_offset: export_state.last_offset,
        last_export_time: export_state.last_export_timestamp,
        is_complete: export_state.last_offset >= export_state.total_items_known,
        batch_number: export_state.batch_number,
    })
}

pub fn get_export_files() -> Result<Vec<serde_json::Value>, String> {
    let desktop_path = get_desktop_path()?;
    let export_dir = desktop_path.join("project one test");

    if !export_dir.exists() {
        return Ok(vec![]);
    }

    let mut files = Vec::new();

    match fs::read_dir(export_dir) {
        Ok(entries) => {
            for entry in entries {
                if let Ok(entry) = entry {
                    let path = entry.path();
                    if let Some(extension) = path.extension() {
                        if extension == "json" {
                            if let Ok(metadata) = fs::metadata(&path) {
                                let file_info = serde_json::json!({
                                    "filename": path.file_name().unwrap().to_string_lossy(),
                                    "filePath": path.to_string_lossy(),
                                    "size": metadata.len(),
                                    "created": metadata.created().unwrap_or(metadata.modified().unwrap()).duration_since(UNIX_EPOCH).unwrap().as_secs(),
                                    "modified": metadata.modified().unwrap().duration_since(UNIX_EPOCH).unwrap().as_secs()
                                });
                                files.push(file_info);
                            }
                        }
                    }
                }
            }
        }
        Err(e) => return Err(format!("Failed to read export directory: {}", e)),
    }

    // Sort by modified date, newest first
    files.sort_by(|a, b| {
        let a_time = a["modified"].as_u64().unwrap_or(0);
        let b_time = b["modified"].as_u64().unwrap_or(0);
        b_time.cmp(&a_time)
    });

    Ok(files)
}
