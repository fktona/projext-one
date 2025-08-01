use crate::types::{AudioData, ExportData, ExportMetadata, OcrData, ScreenPipeResponse, UiData};
use reqwest::Client;
use serde_json;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

fn run_screenpipe(args: &[&str]) -> Result<String, String> {
    Command::new("screenpipe")
        .args(args)
        .output()
        .map_err(|e| format!("Failed to run screenpipe: {}", e))
        .and_then(|output| {
            if output.status.success() {
                Ok(String::from_utf8_lossy(&output.stdout).to_string())
            } else {
                Err(String::from_utf8_lossy(&output.stderr).to_string())
            }
        })
}

pub fn screenpipe_help() -> Result<String, String> {
    run_screenpipe(&["--help"])
}

pub fn screenpipe_version() -> Result<String, String> {
    run_screenpipe(&["--version"])
}

pub fn screenpipe_audio(args: &[&str]) -> Result<String, String> {
    let mut cmd = vec!["audio"];
    cmd.extend_from_slice(args);
    run_screenpipe(&cmd)
}

pub fn screenpipe_vision(args: &[&str]) -> Result<String, String> {
    let mut cmd = vec!["vision"];
    cmd.extend_from_slice(args);
    run_screenpipe(&cmd)
}

pub fn screenpipe_pipe(args: &[&str]) -> Result<String, String> {
    let mut cmd = vec!["pipe"];
    cmd.extend_from_slice(args);
    run_screenpipe(&cmd)
}

pub fn screenpipe_mcp(args: &[&str]) -> Result<String, String> {
    let mut cmd = vec!["mcp"];
    cmd.extend_from_slice(args);
    run_screenpipe(&cmd)
}

pub fn screenpipe_add(args: &[&str]) -> Result<String, String> {
    let mut cmd = vec!["add"];
    cmd.extend_from_slice(args);
    run_screenpipe(&cmd)
}

pub fn screenpipe_migrate(args: &[&str]) -> Result<String, String> {
    let mut cmd = vec!["migrate"];
    cmd.extend_from_slice(args);
    run_screenpipe(&cmd)
}

pub fn screenpipe_completions(args: &[&str]) -> Result<String, String> {
    let mut cmd = vec!["completions"];
    cmd.extend_from_slice(args);
    run_screenpipe(&cmd)
}

// Generic function for any command
pub fn screenpipe_custom(args: &[&str]) -> Result<String, String> {
    run_screenpipe(args)
}

pub async fn fetch_screenpipe_data(start_time: u64) -> Result<ExportData, String> {
    let client = Client::new();

    let mut all_data = Vec::new();
    let mut ocr_data = Vec::new();
    let mut audio_data = Vec::new();
    let mut ui_data = Vec::new();

    let mut offset = 0;
    let limit = 100;
    let mut has_more = true;

    while has_more {
        let url = format!(
            "http://localhost:3030/search?content_type=ocr&limit={}&offset={}",
            limit,
            offset / 10
        );

        println!("Fetching data from: {}", url);

        let response = client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Failed to send request: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("HTTP error: {}", response.status()));
        }

        let response_text = response
            .text()
            .await
            .map_err(|e| format!("Failed to read response: {}", e))?;

        let screenpipe_response: ScreenPipeResponse = serde_json::from_str(&response_text)
            .map_err(|e| format!("Failed to parse JSON: {}", e))?;

        for item in screenpipe_response.data {
            all_data.push(item.content.clone());

            match item.content_type.to_lowercase().as_str() {
                "ocr" => {
                    if let Some(text) = item.content["text"].as_str() {
                        let ocr_item = OcrData {
                            text: text.to_string(),
                            app_name: item.content["app_name"].as_str().unwrap_or("").to_string(),
                            window_name: item.content["window_name"]
                                .as_str()
                                .unwrap_or("")
                                .to_string(),
                            timestamp: item.content["timestamp"].as_str().unwrap_or("").to_string(),
                            raw_content: item.content,
                        };
                        ocr_data.push(ocr_item);
                    }
                }
                "audio" => {
                    if let Some(transcription) = item.content["transcription"].as_str() {
                        let audio_item = AudioData {
                            transcription: transcription.to_string(),
                            speaker_id: item.content["speaker_id"]
                                .as_str()
                                .unwrap_or("")
                                .to_string(),
                            raw_content: item.content,
                        };
                        audio_data.push(audio_item);
                    }
                }
                "ui" => {
                    let ui_item = UiData {
                        element_type: item.content["element_type"]
                            .as_str()
                            .unwrap_or("")
                            .to_string(),
                        raw_content: item.content,
                    };
                    ui_data.push(ui_item);
                }
                _ => {}
            }
        }

        has_more = screenpipe_response.pagination.offset + screenpipe_response.pagination.limit
            < screenpipe_response.pagination.total;
        offset += limit;

        // Safety check to prevent infinite loops
        if offset > 10000 {
            println!("Reached maximum offset, stopping fetch");
            break;
        }
    }

    let now = SystemTime::now();
    let export_date = now.duration_since(UNIX_EPOCH).unwrap().as_secs();

    let metadata = ExportMetadata {
        export_date: export_date.to_string(),
        start_date: start_time.to_string(),
        end_date: export_date.to_string(),
        total_items: all_data.len(),
    };

    Ok(ExportData {
        ocr: ocr_data,
        audio: audio_data,
        ui: ui_data,
        all: all_data,
        metadata,
    })
}

pub async fn fetch_screenpipe_data_with_query(
    query: serde_json::Value,
) -> Result<ExportData, String> {
    let client = Client::new();

    let mut all_data = Vec::new();
    let mut ocr_data = Vec::new();
    let mut audio_data = Vec::new();
    let mut ui_data = Vec::new();

    let mut offset = 0;
    let limit = 100;
    let mut has_more = true;

    // Extract query parameters
    let content_type = query["content_type"].as_str();
    let start_time = query["start_time"].as_str();
    let end_time = query["end_time"].as_str();
    let _query_limit = query["limit"].as_u64().unwrap_or(100);
    let _query_offset = query["offset"].as_u64().unwrap_or(0);

    while has_more {
        let mut url = format!(
            "http://localhost:3030/search?content_type=ocr&limit={}&offset={}",
            limit,
            offset / 10
        );

        // Add optional query parameters
        if let Some(ct) = content_type {
            url.push_str(&format!("&content_type={}", ct));
        }
        if let Some(st) = start_time {
            url.push_str(&format!("&start_time={}", st));
        }
        if let Some(et) = end_time {
            url.push_str(&format!("&end_time={}", et));
        }

        println!("Fetching data from: {}", url);

        let response = client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Failed to send request: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("HTTP error: {}", response.status()));
        }

        let response_text = response
            .text()
            .await
            .map_err(|e| format!("Failed to read response: {}", e))?;

        let screenpipe_response: ScreenPipeResponse = serde_json::from_str(&response_text)
            .map_err(|e| format!("Failed to parse JSON: {}", e))?;

        for item in screenpipe_response.data {
            all_data.push(item.content.clone());

            match item.content_type.to_lowercase().as_str() {
                "ocr" => {
                    if let Some(text) = item.content["text"].as_str() {
                        let ocr_item = OcrData {
                            text: text.to_string(),
                            app_name: item.content["app_name"].as_str().unwrap_or("").to_string(),
                            window_name: item.content["window_name"]
                                .as_str()
                                .unwrap_or("")
                                .to_string(),
                            timestamp: item.content["timestamp"].as_str().unwrap_or("").to_string(),
                            raw_content: item.content,
                        };
                        ocr_data.push(ocr_item);
                    }
                }
                "audio" => {
                    if let Some(transcription) = item.content["transcription"].as_str() {
                        let audio_item = AudioData {
                            transcription: transcription.to_string(),
                            speaker_id: item.content["speaker_id"]
                                .as_str()
                                .unwrap_or("")
                                .to_string(),
                            raw_content: item.content,
                        };
                        audio_data.push(audio_item);
                    }
                }
                "ui" => {
                    let ui_item = UiData {
                        element_type: item.content["element_type"]
                            .as_str()
                            .unwrap_or("")
                            .to_string(),
                        raw_content: item.content,
                    };
                    ui_data.push(ui_item);
                }
                _ => {}
            }
        }

        has_more = screenpipe_response.pagination.offset + screenpipe_response.pagination.limit
            < screenpipe_response.pagination.total;
        offset += limit;

        // Safety check to prevent infinite loops
        if offset > 10000 {
            println!("Reached maximum offset, stopping fetch");
            break;
        }
    }

    let now = SystemTime::now();
    let export_date = now.duration_since(UNIX_EPOCH).unwrap().as_secs();

    let metadata = ExportMetadata {
        export_date: export_date.to_string(),
        start_date: start_time.unwrap_or(&export_date.to_string()).to_string(),
        end_date: end_time.unwrap_or(&export_date.to_string()).to_string(),
        total_items: all_data.len(),
    };

    Ok(ExportData {
        ocr: ocr_data,
        audio: audio_data,
        ui: ui_data,
        all: all_data,
        metadata,
    })
}

pub async fn fetch_screenpipe_data_with_offset(start_offset: u64) -> Result<ExportData, String> {
    let client = Client::new();

    let mut all_data = Vec::new();
    let mut ocr_data = Vec::new();
    let mut audio_data = Vec::new();
    let mut ui_data = Vec::new();

    let mut offset = start_offset;
    let limit = 100;
    let mut has_more = true;
    let mut total_items_known = 0u64;

    while has_more {
        let url = format!(
            "http://localhost:3030/search?content_type=ocr&limit={}&offset={}",
            limit,
            offset / 10
        );

        println!("Fetching data from offset {}: {}", offset, url);

        let response = client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Failed to send request: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("HTTP error: {}", response.status()));
        }

        let response_text = response
            .text()
            .await
            .map_err(|e| format!("Failed to read response: {}", e))?;

        let screenpipe_response: ScreenPipeResponse = serde_json::from_str(&response_text)
            .map_err(|e| format!("Failed to parse JSON: {}", e))?;

        // Update total items known
        total_items_known = screenpipe_response.pagination.total;

        // If no data returned, we're done
        if screenpipe_response.data.is_empty() {
            // has_more = false;
            break;
        }

        for item in screenpipe_response.data {
            all_data.push(item.content.clone());

            match item.content_type.to_lowercase().as_str() {
                "ocr" => {
                    if let Some(text) = item.content["text"].as_str() {
                        let ocr_item = OcrData {
                            text: text.to_string(),
                            app_name: item.content["app_name"].as_str().unwrap_or("").to_string(),
                            window_name: item.content["window_name"]
                                .as_str()
                                .unwrap_or("")
                                .to_string(),
                            timestamp: item.content["timestamp"].as_str().unwrap_or("").to_string(),
                            raw_content: item.content,
                        };
                        ocr_data.push(ocr_item);
                    }
                }
                "audio" => {
                    if let Some(transcription) = item.content["transcription"].as_str() {
                        let audio_item = AudioData {
                            transcription: transcription.to_string(),
                            speaker_id: item.content["speaker_id"]
                                .as_str()
                                .unwrap_or("")
                                .to_string(),
                            raw_content: item.content,
                        };
                        audio_data.push(audio_item);
                    }
                }
                "ui" => {
                    let ui_item = UiData {
                        element_type: item.content["element_type"]
                            .as_str()
                            .unwrap_or("")
                            .to_string(),
                        raw_content: item.content,
                    };
                    ui_data.push(ui_item);
                }
                _ => {}
            }
        }

        has_more = screenpipe_response.pagination.offset + screenpipe_response.pagination.limit
            < screenpipe_response.pagination.total;
        offset += limit;

        // Safety check to prevent infinite loops
        if offset > 10000 {
            println!("Reached maximum offset, stopping fetch");
            break;
        }
    }

    let now = SystemTime::now();
    let export_date = now.duration_since(UNIX_EPOCH).unwrap().as_secs();

    let metadata = ExportMetadata {
        export_date: export_date.to_string(),
        start_date: start_offset.to_string(),
        end_date: export_date.to_string(),
        total_items: total_items_known as usize,
    };

    Ok(ExportData {
        ocr: ocr_data,
        audio: audio_data,
        ui: ui_data,
        all: all_data,
        metadata,
    })
}

pub async fn fetch_screenpipe_data_with_query_and_offset(
    query: serde_json::Value,
    start_offset: u64,
) -> Result<ExportData, String> {
    let client = Client::new();

    let mut all_data = Vec::new();
    let mut ocr_data = Vec::new();
    let mut audio_data = Vec::new();
    let mut ui_data = Vec::new();

    let mut offset = start_offset;
    let limit = 100;
    let mut has_more = true;
    let mut total_items_known = 0u64;

    // Extract query parameters
    let content_type = query["content_type"].as_str();
    let start_time = query["start_time"].as_str();
    let end_time = query["end_time"].as_str();

    while has_more {
        let mut url = format!(
            "http://localhost:3030/search?content_type=ocr&limit={}&offset={}",
            limit,
            offset / 10
        );

        // Add optional query parameters
        if let Some(ct) = content_type {
            url.push_str(&format!("&content_type={}", ct));
        }
        if let Some(st) = start_time {
            url.push_str(&format!("&start_time={}", st));
        }
        if let Some(et) = end_time {
            url.push_str(&format!("&end_time={}", et));
        }

        println!("Fetching data from offset {}: {}", offset, url);

        let response = client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Failed to send request: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("HTTP error: {}", response.status()));
        }

        let response_text = response
            .text()
            .await
            .map_err(|e| format!("Failed to read response: {}", e))?;

        let screenpipe_response: ScreenPipeResponse = serde_json::from_str(&response_text)
            .map_err(|e| format!("Failed to parse JSON: {}", e))?;

        // Update total items known
        total_items_known = screenpipe_response.pagination.total;

        // If no data returned, we're done
        if screenpipe_response.data.is_empty() {
            // has_more = false;
            break;
        }

        for item in screenpipe_response.data {
            all_data.push(item.content.clone());

            match item.content_type.to_lowercase().as_str() {
                "ocr" => {
                    if let Some(text) = item.content["text"].as_str() {
                        let ocr_item = OcrData {
                            text: text.to_string(),
                            app_name: item.content["app_name"].as_str().unwrap_or("").to_string(),
                            window_name: item.content["window_name"]
                                .as_str()
                                .unwrap_or("")
                                .to_string(),
                            timestamp: item.content["timestamp"].as_str().unwrap_or("").to_string(),
                            raw_content: item.content,
                        };
                        ocr_data.push(ocr_item);
                    }
                }
                "audio" => {
                    if let Some(transcription) = item.content["transcription"].as_str() {
                        let audio_item = AudioData {
                            transcription: transcription.to_string(),
                            speaker_id: item.content["speaker_id"]
                                .as_str()
                                .unwrap_or("")
                                .to_string(),
                            raw_content: item.content,
                        };
                        audio_data.push(audio_item);
                    }
                }
                "ui" => {
                    let ui_item = UiData {
                        element_type: item.content["element_type"]
                            .as_str()
                            .unwrap_or("")
                            .to_string(),
                        raw_content: item.content,
                    };
                    ui_data.push(ui_item);
                }
                _ => {}
            }
        }

        has_more = screenpipe_response.pagination.offset + screenpipe_response.pagination.limit
            < screenpipe_response.pagination.total;
        offset += limit;

        // Safety check to prevent infinite loops
        if offset > 10000 {
            println!("Reached maximum offset, stopping fetch");
            break;
        }
    }

    let now = SystemTime::now();
    let export_date = now.duration_since(UNIX_EPOCH).unwrap().as_secs();

    let metadata = ExportMetadata {
        export_date: export_date.to_string(),
        start_date: start_time.unwrap_or(&start_offset.to_string()).to_string(),
        end_date: end_time.unwrap_or(&export_date.to_string()).to_string(),
        total_items: total_items_known as usize,
    };

    Ok(ExportData {
        ocr: ocr_data,
        audio: audio_data,
        ui: ui_data,
        all: all_data,
        metadata,
    })
}
