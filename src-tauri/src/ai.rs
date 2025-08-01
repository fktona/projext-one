use reqwest::Client;
use std::sync::{Arc, Mutex};
use tokio::runtime::Runtime;

use crate::rag::{ingest_sql_data_rag, query_rag_system, RAGQuery};
use crate::types::{OpenAIMessage, OpenAIRequest, OpenAIResponse};

// Global state for storing selected model
static SELECTED_MODEL: once_cell::sync::Lazy<Arc<Mutex<Option<String>>>> =
    once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(None)));

// Ollama API request structure
#[derive(serde::Serialize)]
struct OllamaRequest {
    model: String,
    prompt: String,
    stream: bool,
}

// Ollama API response structure
#[derive(serde::Deserialize)]
struct OllamaResponse {
    response: String,
    done: bool,
    #[serde(rename = "model")]
    model_name: String,
}

// Function to set the selected model
pub fn set_selected_model(model: &str) {
    if let Ok(mut selected) = SELECTED_MODEL.lock() {
        *selected = Some(model.to_string());
        println!("[AI] Selected model updated to: {}", model);
    }
}

// Function to get the selected model
pub fn get_selected_model() -> Option<String> {
    if let Ok(selected) = SELECTED_MODEL.lock() {
        selected.clone()
    } else {
        None
    }
}

// Function to clear the selected model
pub fn clear_selected_model() {
    if let Ok(mut selected) = SELECTED_MODEL.lock() {
        *selected = None;
        println!("[AI] Selected model cleared");
    }
}

pub fn call_ollama(prompt: &str) -> Result<String, String> {
    println!("[OLLAMA] DEBUG: call_ollama started");
    // Get the selected model or use default
    let model = get_selected_model().unwrap_or_else(|| "gemma3n:latest".to_string());
    println!("[OLLAMA] DEBUG: Using model: {}", model);
    call_ollama_with_model(prompt, &model)
}

// Use HTTP API instead of CLI
pub async fn call_ollama_with_model_async(prompt: &str, model: &str) -> Result<String, String> {
    println!("[OLLAMA] DEBUG: call_ollama_with_model_async started");
    println!("[OLLAMA] DEBUG: Model: {}", model);
    println!("[OLLAMA] DEBUG: Prompt length: {} characters", prompt.len());

    let request_body = OllamaRequest {
        model: model.to_string(),
        prompt: prompt.to_string(),
        stream: false,
    };

    let client = reqwest::Client::new();
    let response = client
        .post("http://localhost:11434/api/generate")
        .header("Content-Type", "application/json")
        .timeout(std::time::Duration::from_secs(300))
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to send request to Ollama: {}", e))?;

    if !response.status().is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        println!("[OLLAMA] DEBUG: Ollama API error: {}", error_text);
        return Err(format!("Ollama API error: {}", error_text));
    }

    let response_body: OllamaResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Ollama response: {}", e))?;

    println!(
        "[OLLAMA] DEBUG: Ollama API response length: {} characters",
        response_body.response.len()
    );
    Ok(response_body.response.trim().to_string())
}

// Synchronous wrapper for compatibility
pub fn call_ollama_with_model(prompt: &str, model: &str) -> Result<String, String> {
    let rt =
        tokio::runtime::Runtime::new().map_err(|e| format!("Failed to create runtime: {}", e))?;
    rt.block_on(call_ollama_with_model_async(prompt, model))
}

// Function to check if Ollama is running
pub fn check_ollama_status() -> Result<bool, String> {
    use reqwest::blocking::Client as BlockingClient;

    let client = BlockingClient::new();

    let response = client
        .get("http://localhost:11434/api/tags")
        .timeout(std::time::Duration::from_secs(5)) // 5 second timeout
        .send();

    match response {
        Ok(resp) => Ok(resp.status().is_success()),
        Err(_) => Ok(false), // Ollama not running
    }
}

pub fn call_openai(prompt: &str) -> Result<String, String> {
    // Use the provided key if present, otherwise check env
    let api_key = std::env::var("OPENAI_API_KEY").unwrap_or_else(|_| "".to_string());
    // Set env for future calls
    std::env::set_var("OPENAI_API_KEY", &api_key);

    use reqwest::blocking::Client as BlockingClient;

    let client = BlockingClient::new();

    let request_body = OpenAIRequest {
        model: "gpt-4o-mini".to_string(),
        messages: vec![
            OpenAIMessage {
                role: "system".to_string(),
                content: "You are a friendly, personal AI assistant who helps analyze your digital life through ScreenPipe data. You have access to your screenshots (OCR text), voice recordings (transcriptions), and app usage patterns. 

Your personality:
- Warm, conversational, and genuinely helpful
- Use 'you' and speak directly to the person
- Show empathy and understanding of their digital habits
- Be encouraging and positive about their productivity
- Ask follow-up questions when relevant
- Use casual language like 'looks like', 'I can see', 'it seems'
- Share insights that feel personal and meaningful

When analyzing data:
- Look for patterns in their daily routine
- Identify productivity trends and time management
- Notice what apps/websites they use most
- Understand their work style and preferences
- Find interesting insights about their digital behavior
- Suggest improvements or observations gently

Always be supportive and make them feel understood. You're here to help them understand their digital life better!".to_string(),
            },
            OpenAIMessage {
                role: "user".to_string(),
                content: prompt.to_string(),
            },
        ],
        max_tokens: 2000,
        temperature: 0.7,
    };

    let response = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .map_err(|e| format!("Failed to send request to OpenAI: {}", e))?;

    if !response.status().is_success() {
        let error_text = response
            .text()
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("OpenAI API error: {}", error_text));
    }

    let response_body = response
        .json::<OpenAIResponse>()
        .map_err(|e| format!("Failed to parse OpenAI response: {}", e))?;

    if response_body.choices.is_empty() {
        return Err("No response from OpenAI".to_string());
    }

    Ok(response_body.choices[0].message.content.clone())
}

pub async fn call_openai_async(prompt: &str) -> Result<String, String> {
    // Use the provided key if present, otherwise check env
    let api_key = std::env::var("OPENAI_API_KEY").unwrap_or_else(|_| "".to_string());
    // Set env for future calls
    std::env::set_var("OPENAI_API_KEY", &api_key);

    use reqwest::Client;

    let client = Client::new();

    let request_body = OpenAIRequest {
        model: "gpt-4o-mini".to_string(),
        messages: vec![
            OpenAIMessage {
                role: "system".to_string(),
                content: "You are a friendly, personal AI assistant who helps analyze your digital life through ScreenPipe data. You have access to your screenshots (OCR text), voice recordings (transcriptions), and app usage patterns. 

Your personality:
- Warm, conversational, and genuinely helpful
- Use 'you' and speak directly to the person
- Show empathy and understanding of their digital habits
- Be encouraging and positive about their productivity
- Ask follow-up questions when relevant
- Use casual language like 'looks like', 'I can see', 'it seems'
- Share insights that feel personal and meaningful

When analyzing data:
- Look for patterns in their daily routine
- Identify productivity trends and time management
- Notice what apps/websites they use most
- Understand their work style and preferences
- Find interesting insights about their digital behavior
- Suggest improvements or observations gently

Always be supportive and make them feel understood. You're here to help them understand their digital life better!".to_string(),
            },
            OpenAIMessage {
                role: "user".to_string(),
                content: prompt.to_string(),
            },
        ],
        max_tokens: 2000,
        temperature: 0.7,
    };

    let response = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to send request to OpenAI: {}", e))?;

    if !response.status().is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("OpenAI API error: {}", error_text));
    }

    let response_body = response
        .json::<OpenAIResponse>()
        .await
        .map_err(|e| format!("Failed to parse OpenAI response: {}", e))?;

    if response_body.choices.is_empty() {
        return Err("No response from OpenAI".to_string());
    }

    Ok(response_body.choices[0].message.content.clone())
}

pub fn call_openai_with_agent(prompt: &str, agent_type: &str) -> Result<String, String> {
    println!("[OPENAI] DEBUG: call_openai_with_agent started");
    println!("[OPENAI] DEBUG: Agent type: {}", agent_type);
    println!("[OPENAI] DEBUG: Prompt length: {} characters", prompt.len());
    // Use the provided key if present, otherwise check env
    let api_key = std::env::var("OPENAI_API_KEY").unwrap_or_else(|_| "".to_string());
    std::env::set_var("OPENAI_API_KEY", &api_key);

    println!("[OPENAI] DEBUG: OpenAI API key retrieved");

    // For now, let's skip OpenAI and go directly to Ollama to avoid runtime conflicts
    println!("[OPENAI] DEBUG: Skipping OpenAI due to runtime conflicts, will use Ollama instead");
    Err("OpenAI temporarily disabled due to runtime conflicts".to_string())
}

pub async fn call_openai_with_agent_async(
    prompt: &str,
    agent_type: &str,
) -> Result<String, String> {
    println!("[OPENAI] DEBUG: call_openai_with_agent_async started");
    println!("[OPENAI] DEBUG: Agent type: {}", agent_type);
    println!("[OPENAI] DEBUG: Prompt length: {} characters", prompt.len());

    // Use the provided key if present, otherwise check env
    let api_key = std::env::var("OPENAI_API_KEY").unwrap_or_else(|_| "".to_string());
    std::env::set_var("OPENAI_API_KEY", &api_key);

    println!("[OPENAI] DEBUG: OpenAI API key retrieved");

    use reqwest::Client;

    let client = Client::new();

    // Customize system prompt based on agent type
    let system_content = match agent_type {
        "productivity" => "You are a productivity AI assistant analyzing digital activity data. Focus on time management, work efficiency, and productive habits. Provide actionable insights about productivity patterns and suggest improvements.",
        "app_usage" => "You are an app usage AI assistant analyzing digital activity data. Focus on application usage patterns, time spent in different apps, and digital behavior analysis. Provide insights about app usage trends and habits.",
        "data_insights" => "You are a data insights AI assistant analyzing digital activity data. Focus on finding interesting patterns, trends, and correlations in the data. Provide analytical insights and data-driven observations.",
        "conversation" => "You are a personal AI assistant having a natural conversation with the user. You have access to their digital activity data including screenshots, voice recordings, and app usage patterns. 

Your personality:
- Warm, friendly, and conversational
- Speak naturally as if talking to a friend
- Show genuine interest in their digital life and activities
- Be helpful, supportive, and encouraging
- Ask follow-up questions when appropriate
- Use casual, natural language
- Share personal insights about their patterns and habits
- Be empathetic and understanding

When discussing their data:
- Reference their actual activities naturally
- Point out interesting patterns in their routine
- Suggest helpful observations about their productivity
- Ask about their goals and help them achieve them
- Be conversational about their app usage and online behavior
- Offer gentle suggestions for improvement when relevant

Always maintain a natural conversation flow. You're their personal AI companion who understands their digital life!",
        _ => "You are a helpful AI assistant analyzing digital activity data. Provide clear, insightful analysis based on the provided context."
    };

    let request_body = OpenAIRequest {
        model: "gpt-4o-mini".to_string(),
        messages: vec![
            OpenAIMessage {
                role: "system".to_string(),
                content: system_content.to_string(),
            },
            OpenAIMessage {
                role: "user".to_string(),
                content: prompt.to_string(),
            },
        ],
        max_tokens: 2000,
        temperature: 0.7,
    };

    let response = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to send request to OpenAI: {}", e))?;

    if !response.status().is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("OpenAI API error: {}", error_text));
    }

    let response_body = response
        .json::<OpenAIResponse>()
        .await
        .map_err(|e| format!("Failed to parse OpenAI response: {}", e))?;

    if response_body.choices.is_empty() {
        return Err("No response from OpenAI".to_string());
    }

    Ok(response_body.choices[0].message.content.clone())
}

pub fn call_ai(prompt: &str) -> Result<String, String> {
    // Try OpenAI first, fallback to Ollama
    match call_openai(prompt) {
        Ok(response) => Ok(response),
        Err(openai_error) => {
            println!("OpenAI failed: {}. Falling back to Ollama...", openai_error);
            call_ollama(prompt)
        }
    }
}

pub async fn call_ai_async(prompt: &str) -> Result<String, String> {
    // Try OpenAI first, fallback to Ollama (async version)
    match call_openai_async(prompt).await {
        Ok(response) => Ok(response),
        Err(openai_error) => {
            println!("OpenAI failed: {}. Falling back to Ollama...", openai_error);
            // Get the selected model or use default
            let model = get_selected_model().unwrap_or_else(|| "gemma3n:latest".to_string());
            call_ollama_with_model_async(prompt, &model).await
        }
    }
}

pub fn call_ai_with_agent(prompt: &str, agent_type: &str) -> Result<String, String> {
    println!("[AI_AGENT] DEBUG: call_ai_with_agent started");
    println!("[AI_AGENT] DEBUG: Agent type: {}", agent_type);
    println!(
        "[AI_AGENT] DEBUG: Prompt length: {} characters",
        prompt.len()
    );

    // Try OpenAI first, fallback to Ollama
    println!("[AI_AGENT] DEBUG: About to try OpenAI first");
    match call_openai_with_agent(prompt, agent_type) {
        Ok(response) => {
            println!(
                "[AI_AGENT] DEBUG: OpenAI succeeded, response length: {}",
                response.len()
            );
            Ok(response)
        }
        Err(openai_error) => {
            println!(
                "[AI_AGENT] DEBUG: OpenAI failed: {}. Falling back to Ollama...",
                openai_error
            );
            println!("[AI_AGENT] DEBUG: About to call Ollama");
            let ollama_result = call_ollama(prompt);
            match &ollama_result {
                Ok(response) => {
                    println!(
                        "[AI_AGENT] DEBUG: Ollama succeeded, response length: {}",
                        response.len()
                    );
                }
                Err(e) => {
                    println!("[AI_AGENT] DEBUG: Ollama failed: {}", e);
                }
            }
            ollama_result
        }
    }
}

pub async fn call_ai_with_agent_async(prompt: &str, agent_type: &str) -> Result<String, String> {
    println!("[AI_AGENT] DEBUG: call_ai_with_agent_async started");
    println!("[AI_AGENT] DEBUG: Agent type: {}", agent_type);
    println!(
        "[AI_AGENT] DEBUG: Prompt length: {} characters",
        prompt.len()
    );

    // Try OpenAI first, fallback to Ollama (async version)
    println!("[AI_AGENT] DEBUG: About to try OpenAI first");
    match call_openai_with_agent_async(prompt, agent_type).await {
        Ok(response) => {
            println!(
                "[AI_AGENT] DEBUG: OpenAI succeeded, response length: {}",
                response.len()
            );
            Ok(response)
        }
        Err(openai_error) => {
            println!(
                "[AI_AGENT] DEBUG: OpenAI failed: {}. Falling back to Ollama...",
                openai_error
            );
            println!("[AI_AGENT] DEBUG: About to call Ollama");
            // Get the selected model or use default
            let model = get_selected_model().unwrap_or_else(|| "gemma3n:latest".to_string());
            let ollama_result = call_ollama_with_model_async(prompt, &model).await;
            match &ollama_result {
                Ok(response) => {
                    println!(
                        "[AI_AGENT] DEBUG: Ollama succeeded, response length: {}",
                        response.len()
                    );
                }
                Err(e) => {
                    println!("[AI_AGENT] DEBUG: Ollama failed: {}", e);
                }
            }
            ollama_result
        }
    }
}

pub fn prepare_ai_context(data_files: &[serde_json::Value]) -> Result<String, String> {
    let mut context_parts = Vec::new();

    for (file_index, file_data) in data_files.iter().enumerate() {
        let mut file_summary = format!("File {}:\n", file_index + 1);

        // Extract OCR data
        if let Some(ocr_array) = file_data["ocr"].as_array() {
            if !ocr_array.is_empty() {
                file_summary.push_str(&format!("- OCR Text ({} items): ", ocr_array.len()));
                let ocr_texts: Vec<String> = ocr_array
                    .iter()
                    .filter_map(|item| item["text"].as_str())
                    .take(10) // Limit to first 10 items
                    .map(|s| s.to_string())
                    .collect();
                file_summary.push_str(&ocr_texts.join(" | "));
                file_summary.push('\n');
            }
        }

        // Extract Audio data
        if let Some(audio_array) = file_data["audio"].as_array() {
            if !audio_array.is_empty() {
                file_summary.push_str(&format!(
                    "- Audio Transcriptions ({} items): ",
                    audio_array.len()
                ));
                let audio_texts: Vec<String> = audio_array
                    .iter()
                    .filter_map(|item| item["transcription"].as_str())
                    .take(5) // Limit to first 5 items
                    .map(|s| s.to_string())
                    .collect();
                file_summary.push_str(&audio_texts.join(" | "));
                file_summary.push('\n');
            }
        }

        // Extract metadata
        if let Some(metadata) = file_data["metadata"].as_object() {
            if let Some(export_date) = metadata["export_date"].as_str() {
                file_summary.push_str(&format!("- Export Date: {}\n", export_date));
            }
            if let Some(total_items) = metadata["total_items"].as_u64() {
                file_summary.push_str(&format!("- Total Items: {}\n", total_items));
            }
        }

        context_parts.push(file_summary);
    }

    Ok(context_parts.join("\n"))
}

// Time range enum for AI analysis
#[derive(Debug, Clone)]
pub enum TimeRange {
    Daily,
    Weekly,
    Monthly,
    Yearly,
    AllTime,
}

impl TimeRange {
    pub fn to_sql_filter(&self) -> String {
        match self {
            TimeRange::Daily => "f.timestamp > datetime('now', '-1 day')".to_string(),
            TimeRange::Weekly => "f.timestamp > datetime('now', '-7 days')".to_string(),
            TimeRange::Monthly => "f.timestamp > datetime('now', '-30 days')".to_string(),
            TimeRange::Yearly => "f.timestamp > datetime('now', '-1 year')".to_string(),
            TimeRange::AllTime => "1=1".to_string(), // No time filter
        }
    }

    fn to_string(&self) -> &'static str {
        match self {
            TimeRange::Daily => "daily",
            TimeRange::Weekly => "weekly",
            TimeRange::Monthly => "monthly",
            TimeRange::Yearly => "yearly",
            TimeRange::AllTime => "all time",
        }
    }
}

// New function to prepare AI context using SQL queries
pub fn prepare_ai_context_sql(time_range: TimeRange) -> Result<String, String> {
    let client = Client::new();

    // Build SQL query based on time range
    let time_filter = time_range.to_sql_filter();
    let query = format!(
        r#"
        SELECT 
            f.id AS frame_id, 
            f.timestamp, 
            f.name AS video_file, 
            f.window_name, 
            f.app_name, 
            f.browser_url, 
            ac.file_path AS audio_file, 
            at.transcription, 
            at.device, 
            at.is_input_device, 
            at.transcription_engine, 
            at.start_time, 
            at.end_time, 
            o.text AS ocr_text, 
            o.text_length AS ocr_text_length, 
            COUNT(*) OVER () AS total_count 
        FROM frames f 
        LEFT JOIN audio_chunks ac ON f.video_chunk_id = ac.id 
        LEFT JOIN audio_transcriptions at ON at.audio_chunk_id = ac.id 
        LEFT JOIN ocr_text o ON o.frame_id = f.id 
        WHERE {} 
        ORDER BY f.timestamp DESC 
        LIMIT 1000;
        "#,
        time_filter
    );

    // Create a runtime for async operations
    let rt = Runtime::new().map_err(|e| format!("Failed to create runtime: {}", e))?;

    let response = rt
        .block_on(async {
            client
                .post("http://localhost:3030/raw_sql")
                .header("Content-Type", "application/json")
                .timeout(std::time::Duration::from_secs(30))
                .json(&serde_json::json!({ "query": query }))
                .send()
                .await
        })
        .map_err(|e| format!("Failed to send SQL query: {}", e))?;

    if !response.status().is_success() {
        let error_text = rt
            .block_on(async { response.text().await })
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("SQL API error: {}", error_text));
    }

    let combined_data: Vec<serde_json::Value> = rt
        .block_on(async { response.json().await })
        .map_err(|e| format!("Failed to parse SQL response: {}", e))?;

    // Build context summary
    let mut context_parts = Vec::new();

    // Add time range header
    context_parts.push(format!("Time Period: {}", time_range.to_string()));

    // Process combined data
    if !combined_data.is_empty() {
        // Extract OCR texts
        let ocr_texts: Vec<String> = combined_data
            .iter()
            .filter_map(|item| item["ocr_text"].as_str())
            .filter(|text| !text.is_empty())
            .take(50) // Limit to first 50 items for context
            .map(|s| s.to_string())
            .collect();

        if !ocr_texts.is_empty() {
            context_parts.push(format!(
                "OCR Text Data ({} items): {}",
                ocr_texts.len(),
                ocr_texts.join(" | ")
            ));
        }

        // Extract audio transcriptions
        let audio_texts: Vec<String> = combined_data
            .iter()
            .filter_map(|item| item["transcription"].as_str())
            .filter(|text| !text.is_empty())
            .take(25) // Limit to first 25 items for context
            .map(|s| s.to_string())
            .collect();

        if !audio_texts.is_empty() {
            context_parts.push(format!(
                "Audio Transcriptions ({} items): {}",
                audio_texts.len(),
                audio_texts.join(" | ")
            ));
        }

        // Extract app usage patterns
        let app_usage: std::collections::HashMap<String, u64> = combined_data
            .iter()
            .filter_map(|item| {
                let app_name = item["app_name"].as_str()?;
                if !app_name.is_empty() {
                    Some(app_name.to_string())
                } else {
                    None
                }
            })
            .fold(std::collections::HashMap::new(), |mut acc, app_name| {
                *acc.entry(app_name).or_insert(0) += 1;
                acc
            });

        if !app_usage.is_empty() {
            let app_summary: Vec<String> = app_usage
                .iter()
                .map(|(app, count)| format!("{} ({} times)", app, count))
                .take(20) // Limit to top 20 apps
                .collect();

            context_parts.push(format!("App Usage Summary: {}", app_summary.join(", ")));
        }

        // Extract website usage patterns
        let website_usage: std::collections::HashMap<String, u64> = combined_data
            .iter()
            .filter_map(|item| {
                let url = item["browser_url"].as_str()?;
                if !url.is_empty() {
                    // Extract domain from URL
                    url.split("//")
                        .nth(1)?
                        .split("/")
                        .next()
                        .map(|s| s.to_string())
                } else {
                    None
                }
            })
            .fold(std::collections::HashMap::new(), |mut acc, domain| {
                *acc.entry(domain).or_insert(0) += 1;
                acc
            });

        if !website_usage.is_empty() {
            let website_summary: Vec<String> = website_usage
                .iter()
                .map(|(domain, count)| format!("{} ({} visits)", domain, count))
                .take(15) // Limit to top 15 websites
                .collect();

            context_parts.push(format!(
                "Website Usage Summary: {}",
                website_summary.join(", ")
            ));
        }
    }

    Ok(context_parts.join("\n\n"))
}

// RAG-based context preparation function
pub async fn prepare_ai_context_rag(
    user_question: &str,
    time_range: TimeRange,
) -> Result<String, String> {
    println!("[AI] prepare_ai_context_rag started");
    println!("[AI] User question: {}", user_question);
    println!("[AI] Time range: {:?}", time_range);

    // First, ensure RAG data is ingested for this time range
    println!("[AI] Ingesting RAG data for time range: {:?}", time_range);
    let ingest_result = ingest_sql_data_rag(Some(time_range.to_string().to_string()), None).await;
    match ingest_result {
        Ok(result) => println!("[AI] RAG ingestion successful: {}", result),
        Err(e) => println!("[AI] RAG ingestion failed: {}", e),
    }

    // Create RAG query
    let rag_query = RAGQuery {
        query: user_question.to_string(),
        top_k: 15,                 // Get top 100 most relevant chunks
        similarity_threshold: 0.3, // Lower threshold to get more diverse results
    };

    println!(
        "[AI] RAG query parameters: top_k={}, similarity_threshold={}",
        rag_query.top_k, rag_query.similarity_threshold
    );

    // Query the RAG system
    let rag_response = query_rag_system(
        rag_query.query,
        Some(rag_query.top_k),
        Some(rag_query.similarity_threshold),
        None,
        None,
    )
    .await
    .map_err(|e| format!("RAG query failed: {}", e))?;

    println!(
        "[AI] RAG system returned {} context chunks",
        rag_response.context_chunks.len()
    );

    // Build context from RAG results
    let mut context_parts = Vec::new();

    // Add time range header
    context_parts.push(format!("Time Period: {}", time_range.to_string()));

    // Add RAG context chunks
    if !rag_response.context_chunks.is_empty() {
        let context_text = rag_response
            .context_chunks
            .iter()
            .map(|chunk| {
                let source_info = match chunk.metadata.source_type.as_str() {
                    "ocr" => format!(
                        "[OCR - {}]",
                        chunk.metadata.app_name.as_deref().unwrap_or("Unknown")
                    ),
                    "audio" => format!(
                        "[Audio - {}]",
                        chunk.metadata.speaker_id.as_deref().unwrap_or("Unknown")
                    ),
                    "app_usage" => format!(
                        "[App Usage - {}]",
                        chunk.metadata.app_name.as_deref().unwrap_or("Unknown")
                    ),
                    _ => format!("[{}]", chunk.metadata.source_type),
                };
                format!("{} {}", source_info, chunk.content)
            })
            .collect::<Vec<_>>()
            .join("\n\n");

        context_parts.push(format!(
            "Relevant Data ({} chunks found):\n{}",
            rag_response.context_chunks.len(),
            context_text
        ));

        // Add similarity scores info
        let avg_score = rag_response.similarity_scores.iter().sum::<f32>()
            / rag_response.similarity_scores.len() as f32;
        context_parts.push(format!(
            "Relevance Score: {:.2} (average similarity)",
            avg_score
        ));

        println!(
            "[AI] Context generated with {} chunks, average relevance: {:.2}",
            rag_response.context_chunks.len(),
            avg_score
        );
    } else {
        context_parts.push("No relevant data found for this query.".to_string());
        println!("[AI] No relevant data found for query");
    }

    let final_context = context_parts.join("\n\n");
    println!(
        "[AI] Final context length: {} characters",
        final_context.len()
    );

    // Log the full context to a file
    use chrono::Utc;
    use std::fs::OpenOptions;
    use std::io::Write;

    let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
    let log_filename = format!("ai_context_{}.log", timestamp);
    let mut log_file = OpenOptions::new()
        .create(true)
        .write(true)
        .append(false)
        .open(&log_filename)
        .map_err(|e| format!("Failed to create log file: {}", e))?;

    writeln!(log_file, "=== AI CONTEXT LOG ===")
        .map_err(|e| format!("Failed to write to log file: {}", e))?;
    writeln!(log_file, "Timestamp: {}", Utc::now())
        .map_err(|e| format!("Failed to write to log file: {}", e))?;
    writeln!(log_file, "User Question: {}", user_question)
        .map_err(|e| format!("Failed to write to log file: {}", e))?;
    writeln!(log_file, "Time Range: {:?}", time_range)
        .map_err(|e| format!("Failed to write to log file: {}", e))?;
    writeln!(
        log_file,
        "Context Length: {} characters",
        final_context.len()
    )
    .map_err(|e| format!("Failed to write to log file: {}", e))?;
    writeln!(log_file, "").map_err(|e| format!("Failed to write to log file: {}", e))?;
    writeln!(log_file, "=== FULL CONTEXT ===")
        .map_err(|e| format!("Failed to write to log file: {}", e))?;
    writeln!(log_file, "{}", final_context)
        .map_err(|e| format!("Failed to write to log file: {}", e))?;
    writeln!(log_file, "").map_err(|e| format!("Failed to write to log file: {}", e))?;
    writeln!(log_file, "=== END AI CONTEXT LOG ===")
        .map_err(|e| format!("Failed to write to log file: {}", e))?;

    println!("[AI] Context logged to: {}", log_filename);
    println!(
        "[AI] First 300 chars of context: {}",
        &final_context[..final_context.len().min(300)]
    );
    if final_context.len() > 300 {
        println!("[AI] ... (truncated)");
    }

    Ok(final_context)
}
