use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use uuid::Uuid;

// RAG Configuration
const CHUNK_SIZE: usize = 1000;

// Data structures for RAG
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DataChunk {
    pub id: String,
    pub content: String,
    pub metadata: ChunkMetadata,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChunkMetadata {
    pub source_type: String, // "ocr", "audio", "app_usage", etc.
    pub app_name: Option<String>,
    pub timestamp: Option<String>,
    pub window_name: Option<String>,
    pub speaker_id: Option<String>,
    pub file_index: Option<usize>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RAGQuery {
    pub query: String,
    pub top_k: usize,
    pub similarity_threshold: f32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RAGResponse {
    pub answer: String,
    pub context_chunks: Vec<DataChunk>,
    pub similarity_scores: Vec<f32>,
}

#[derive(Clone)]
pub struct RAGSystem {
    chunks: Vec<DataChunk>,
}

impl RAGSystem {
    pub fn new() -> Self {
        Self { chunks: Vec::new() }
    }

    pub fn ingest_data(&mut self, data_files: &[serde_json::Value]) -> Result<usize> {
        let mut total_chunks = 0;

        for (file_index, file_data) in data_files.iter().enumerate() {
            // Process OCR data
            if let Some(ocr_array) = file_data["ocr"].as_array() {
                for ocr_item in ocr_array {
                    if let Some(text) = ocr_item["text"].as_str() {
                        let chunks = self.chunk_text(text, "ocr", file_index, ocr_item)?;
                        let chunk_count = chunks.len();
                        self.chunks.extend(chunks);
                        total_chunks += chunk_count;
                    }
                }
            }

            // Process Audio data
            if let Some(audio_array) = file_data["audio"].as_array() {
                for audio_item in audio_array {
                    if let Some(transcription) = audio_item["transcription"].as_str() {
                        let chunks =
                            self.chunk_text(transcription, "audio", file_index, audio_item)?;
                        let chunk_count = chunks.len();
                        self.chunks.extend(chunks);
                        total_chunks += chunk_count;
                    }
                }
            }

            // Process App Usage data
            if let Some(app_usage) = file_data["app_usage"].as_object() {
                if let Some(app_name) = app_usage["app_name"].as_str() {
                    let usage_text = format!("App: {} - Usage data", app_name);
                    let chunks = self.chunk_text(
                        &usage_text,
                        "app_usage",
                        file_index,
                        &serde_json::json!({
                            "app_name": app_name
                        }),
                    )?;
                    let chunk_count = chunks.len();
                    self.chunks.extend(chunks);
                    total_chunks += chunk_count;
                }
            }
        }

        println!("[RAG] Ingested {} total chunks", total_chunks);
        Ok(total_chunks)
    }

    fn chunk_text(
        &self,
        text: &str,
        source_type: &str,
        file_index: usize,
        metadata: &serde_json::Value,
    ) -> Result<Vec<DataChunk>> {
        // Simple text chunking by splitting on spaces and taking chunks of CHUNK_SIZE characters
        let words: Vec<&str> = text.split_whitespace().collect();
        let mut chunks = Vec::new();
        let mut current_chunk = String::new();

        for word in words {
            if current_chunk.len() + word.len() + 1 > CHUNK_SIZE {
                if !current_chunk.is_empty() {
                    chunks.push(current_chunk);
                    current_chunk = String::new();
                }
            }
            if !current_chunk.is_empty() {
                current_chunk.push(' ');
            }
            current_chunk.push_str(word);
        }

        if !current_chunk.is_empty() {
            chunks.push(current_chunk);
        }

        let mut data_chunks = Vec::new();

        for (_chunk_index, chunk_text) in chunks.iter().enumerate() {
            let chunk_metadata = ChunkMetadata {
                source_type: source_type.to_string(),
                app_name: metadata["app_name"].as_str().map(|s| s.to_string()),
                timestamp: metadata["timestamp"].as_str().map(|s| s.to_string()),
                window_name: metadata["window_name"].as_str().map(|s| s.to_string()),
                speaker_id: metadata["speaker_id"].as_str().map(|s| s.to_string()),
                file_index: Some(file_index),
            };

            let data_chunk = DataChunk {
                id: Uuid::new_v4().to_string(),
                content: chunk_text.to_string(),
                metadata: chunk_metadata,
            };

            data_chunks.push(data_chunk);
        }

        Ok(data_chunks)
    }

    pub async fn query_rag(&self, query: &RAGQuery) -> Result<RAGResponse> {
        use chrono::Utc;
        use std::fs::OpenOptions;
        use std::io::Write;

        println!("[RAG] Starting search for query: '{}'", query.query);
        println!("[RAG] Total chunks available: {}", self.chunks.len());

        // Create log file with timestamp
        let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
        let log_filename = format!("rag_results_{}.log", timestamp);
        let mut log_file = OpenOptions::new()
            .create(true)
            .write(true)
            .append(false)
            .open(&log_filename)
            .map_err(|e| anyhow::anyhow!("Failed to create log file: {}", e))?;

        writeln!(log_file, "=== RAG QUERY LOG ===")?;
        writeln!(log_file, "Timestamp: {}", Utc::now())?;
        writeln!(log_file, "Query: {}", query.query)?;
        writeln!(log_file, "Total chunks available: {}", self.chunks.len())?;
        writeln!(log_file, "Top K: {}", query.top_k)?;
        writeln!(
            log_file,
            "Similarity threshold: {}",
            query.similarity_threshold
        )?;
        writeln!(log_file, "")?;

        // Improved keyword-based search with better filtering
        let mut context_chunks = Vec::new();
        let mut similarity_scores = Vec::new();

        let query_lower = query.query.to_lowercase();

        // Filter out SQL-specific terms and common words that don't help with matching
        let stop_words = [
            "f.timestamp",
            "datetime",
            "now",
            "hour",
            "day",
            "month",
            "year",
            "the",
            "for",
            "and",
            "or",
            "in",
            "on",
            "at",
            "to",
            "from",
            "with",
            "by",
            "of",
            "a",
            "an",
            "is",
            "are",
            "was",
            "were",
            "be",
            "been",
            "have",
            "has",
            "had",
            "do",
            "does",
            "did",
            "will",
            "would",
            "could",
            "should",
            "may",
            "might",
            "can",
            "must",
            "shall",
            "period:",
            "look",
            "used,",
            "visited,",
            "activities,",
            "tasks,",
            "made.",
            "analyze",
            "all",
            "digital",
            "activity",
            "applications",
            "websites",
            "communication",
            "work",
            "important",
            "actions",
            "decisions",
        ];

        let query_words: Vec<&str> = query_lower
            .split_whitespace()
            .filter(|word| !stop_words.contains(word))
            .collect();

        println!("[RAG] Filtered search keywords: {:?}", query_words);
        writeln!(log_file, "Filtered search keywords: {:?}", query_words)?;

        // If no meaningful keywords, use a broader search
        let search_terms = if query_words.is_empty() {
            vec![
                "app",
                "activity",
                "time",
                "work",
                "communication",
                "development",
                "meeting",
                "coding",
            ]
        } else {
            query_words
        };

        for chunk in &self.chunks {
            let chunk_lower = chunk.content.to_lowercase();
            let mut score = 0.0;

            for word in &search_terms {
                if chunk_lower.contains(word) {
                    score += 1.0;
                }
            }

            if score > 0.0 {
                score = score / search_terms.len() as f32;
                // Lower the threshold for better matching
                if score >= 0.1 {
                    // Much lower threshold
                    context_chunks.push(chunk.clone());
                    similarity_scores.push(score);
                }
            }
        }

        println!(
            "[RAG] Found {} chunks with score >= {}",
            context_chunks.len(),
            query.similarity_threshold
        );
        writeln!(
            log_file,
            "Found {} chunks with score >= {}",
            context_chunks.len(),
            query.similarity_threshold
        )?;

        // Sort by similarity score and take top_k
        let mut indexed_chunks: Vec<(usize, f32)> = similarity_scores
            .iter()
            .enumerate()
            .map(|(idx, &score)| (idx, score))
            .collect();
        indexed_chunks.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

        let top_k = std::cmp::min(query.top_k, indexed_chunks.len());
        let final_chunks: Vec<DataChunk> = indexed_chunks[..top_k]
            .iter()
            .map(|&(idx, _)| context_chunks[idx].clone())
            .collect();
        let final_scores: Vec<f32> = indexed_chunks[..top_k]
            .iter()
            .map(|&(_, score)| score)
            .collect();

        println!("[RAG] Selected top {} chunks:", final_chunks.len());
        writeln!(log_file, "Selected top {} chunks:", final_chunks.len())?;

        for (i, (chunk, score)) in final_chunks.iter().zip(final_scores.iter()).enumerate() {
            println!("[RAG] Chunk {} (Score: {:.3}):", i + 1, score);
            println!("[RAG]   Type: {}", chunk.metadata.source_type);
            println!(
                "[RAG]   App: {}",
                chunk.metadata.app_name.as_deref().unwrap_or("Unknown")
            );
            println!("[RAG]   Content: {}", chunk.content);
            println!("[RAG]   ---");

            writeln!(log_file, "Chunk {} (Score: {:.3}):", i + 1, score)?;
            writeln!(log_file, "  Type: {}", chunk.metadata.source_type)?;
            writeln!(
                log_file,
                "  App: {}",
                chunk.metadata.app_name.as_deref().unwrap_or("Unknown")
            )?;
            writeln!(
                log_file,
                "  Timestamp: {}",
                chunk.metadata.timestamp.as_deref().unwrap_or("Unknown")
            )?;
            writeln!(log_file, "  Content: {}", chunk.content)?;
            writeln!(log_file, "  ---")?;
        }

        // Generate answer using RAG context
        println!("[RAG] Generating AI response...");
        println!("[RAG] DEBUG: About to call generate_rag_answer");
        writeln!(log_file, "Generating AI response...")?;

        let answer = self
            .generate_rag_answer(&query.query, &final_chunks)
            .await?;
        println!("[RAG] DEBUG: generate_rag_answer completed successfully");

        println!("[RAG] AI Response: {}", answer);
        writeln!(log_file, "AI Response: {}", answer)?;

        // Build context that was sent to AI
        let mut context_parts = Vec::new();
        for (i, chunk) in final_chunks.iter().enumerate() {
            context_parts.push(format!(
                "Context {} (Score: {:.3}):\nType: {}\nApp: {}\nContent: {}",
                i + 1,
                final_scores[i],
                chunk.metadata.source_type,
                chunk.metadata.app_name.as_deref().unwrap_or("Unknown"),
                chunk.content
            ));
        }

        let full_context = context_parts.join("\n\n");
        writeln!(log_file, "")?;
        writeln!(log_file, "=== FULL CONTEXT SENT TO AI ===")?;
        writeln!(log_file, "{}", full_context)?;
        writeln!(log_file, "")?;
        writeln!(log_file, "=== END RAG LOG ===")?;

        println!(
            "[RAG] Full context sent to AI ({} characters):",
            full_context.len()
        );
        println!(
            "[RAG] First 500 chars: {}",
            &full_context[..full_context.len().min(500)]
        );
        if full_context.len() > 500 {
            println!("[RAG] ... (truncated)");
        }
        println!("[RAG] Log saved to: {}", log_filename);
        println!("[RAG] Search completed successfully");

        Ok(RAGResponse {
            answer,
            context_chunks: final_chunks,
            similarity_scores: final_scores,
        })
    }

    async fn generate_rag_answer(
        &self,
        query: &str,
        context_chunks: &[DataChunk],
    ) -> Result<String> {
        println!("[RAG] DEBUG: generate_rag_answer started");
        println!(
            "[RAG] DEBUG: Number of context chunks: {}",
            context_chunks.len()
        );

        // Prepare context from chunks
        let context_text = context_chunks
            .iter()
            .map(|chunk| {
                format!(
                    "[{}] {}: {}",
                    chunk.metadata.source_type,
                    chunk.metadata.app_name.as_deref().unwrap_or("Unknown"),
                    chunk.content
                )
            })
            .collect::<Vec<_>>()
            .join("\n\n");

        println!(
            "[RAG] DEBUG: Context text length: {} characters",
            context_text.len()
        );

        // Create RAG prompt
        let prompt = format!(
            "You are a helpful AI assistant analyzing digital activity data. Use the following context to answer the user's question accurately and insightfully.\n\nCONTEXT DATA:\n{}\n\nUSER QUESTION: {}\n\nPlease provide a comprehensive answer based on the context data above. Be specific and reference the actual content when possible. If the context doesn't contain enough information to answer the question, say so clearly.\n\nAnswer:",
            context_text, query
        );

        println!("[RAG] DEBUG: About to call call_ai_async (OpenAI fallback to Ollama)");
        println!("[RAG] DEBUG: Prompt length: {} characters", prompt.len());

        // Use call_ai_async for OpenAI first, fallback to Ollama
        let result = crate::ai::call_ai_async(&prompt).await;

        match &result {
            Ok(response) => {
                println!(
                    "[RAG] DEBUG: call_ai_async succeeded, response length: {}",
                    response.len()
                );
            }
            Err(e) => {
                println!("[RAG] DEBUG: call_ai_async failed: {}", e);
            }
        }

        result.map_err(|e| anyhow::anyhow!("Failed to generate RAG answer: {}", e))
    }

    pub fn clear_collection(&mut self) -> Result<()> {
        self.chunks.clear();
        println!("[RAG] Cleared all chunks");
        Ok(())
    }

    pub fn get_collection_stats(&self) -> Result<HashMap<String, usize>> {
        let mut stats = HashMap::new();
        stats.insert("total_points".to_string(), self.chunks.len());

        Ok(stats)
    }
}

// Global RAG system instance
static RAG_SYSTEM: once_cell::sync::Lazy<Arc<Mutex<Option<RAGSystem>>>> =
    once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(None)));

// Public API functions for Tauri commands
pub async fn initialize_rag() -> Result<String> {
    {
        let mut rag_system = RAG_SYSTEM.lock().unwrap();
        if rag_system.is_none() {
            *rag_system = Some(RAGSystem::new());
        }
    }
    Ok("RAG system initialized successfully".to_string())
}

pub async fn ingest_data_rag(data_files: Vec<serde_json::Value>) -> Result<String> {
    let chunk_count = {
        let mut rag_system = RAG_SYSTEM.lock().unwrap();
        if let Some(ref mut system) = *rag_system {
            system.ingest_data(&data_files)?
        } else {
            return Err(anyhow::anyhow!("RAG system not initialized"));
        }
    };
    Ok(format!("Successfully ingested {} chunks", chunk_count))
}

pub async fn query_rag_system(
    query: String,
    top_k: Option<usize>,
    similarity_threshold: Option<f32>,
    custom_query: Option<String>,
    time_range: Option<String>,
) -> Result<RAGResponse> {
    // If custom query is provided, first ingest the data
    if let Some(custom_sql) = custom_query {
        println!("[RAG] Query with custom SQL provided, ingesting data first");

        // Initialize RAG system if not already initialized
        {
            let mut rag_system = RAG_SYSTEM.lock().unwrap();
            if rag_system.is_none() {
                *rag_system = Some(RAGSystem::new());
                println!("[RAG] Initialized new RAG system for custom query");
            }
        }

        // Ingest data using custom query
        let ingest_result = ingest_sql_data_rag(time_range, Some(custom_sql)).await?;
        println!("[RAG] Custom data ingestion result: {}", ingest_result);
    }

    // Use default values if not provided
    let top_k_value = top_k.unwrap_or(5);
    let similarity_threshold_value = similarity_threshold.unwrap_or(0.1);

    let rag_query = RAGQuery {
        query,
        top_k: top_k_value,
        similarity_threshold: similarity_threshold_value,
    };

    let system_clone = {
        let rag_system = RAG_SYSTEM.lock().unwrap();
        if let Some(ref system) = *rag_system {
            Some(system.clone())
        } else {
            None
        }
    };

    let system = system_clone.ok_or_else(|| anyhow::anyhow!("RAG system not initialized"))?;
    let response = system.query_rag(&rag_query).await?;
    Ok(response)
}

pub async fn clear_rag_data() -> Result<String> {
    {
        let mut rag_system = RAG_SYSTEM.lock().unwrap();
        if let Some(ref mut system) = *rag_system {
            system.clear_collection()?;
        }
    }
    Ok("RAG data cleared successfully".to_string())
}

pub async fn get_rag_stats() -> Result<HashMap<String, usize>> {
    let stats = {
        let rag_system = RAG_SYSTEM.lock().unwrap();
        if let Some(ref system) = *rag_system {
            system.get_collection_stats()?
        } else {
            return Err(anyhow::anyhow!("RAG system not initialized"));
        }
    };
    Ok(stats)
}

// Function to ingest data from SQL queries into RAG system
pub async fn ingest_sql_data_rag(
    time_range: Option<String>,
    custom_query: Option<String>,
) -> Result<String> {
    use reqwest::Client;

    let client = Client::new();
    println!(
        "[RAG] Ingesting data with time_range: {:?}, custom_query: {:?}",
        time_range, custom_query
    );

    // If custom query is provided, use it directly
    if let Some(custom_sql) = custom_query {
        println!("[RAG] Using custom SQL query provided by user");
        println!("[RAG] Custom SQL Query: {}", custom_sql);
        let query = custom_sql;

        println!("[RAG] Sending custom QL query to localhost:3030");
        let response = client
            .post("http://localhost:3030/raw_sql")
            .header("Content-Type", "application/json")
            .timeout(std::time::Duration::from_secs(60))
            .json(&serde_json::json!({ "query": query }))
            .send()
            .await
            .map_err(|e| anyhow::anyhow!("Failed to send SQL query: {}", e))?;

        if !response.status().is_success() {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(anyhow::anyhow!("SQL API error: {}", error_text));
        }

        let sql_data: Vec<serde_json::Value> = response
            .json()
            .await
            .map_err(|e| anyhow::anyhow!("Failed to parse SQL response: {}", e))?;

        // Process custom query results using existing logic
        return process_sql_data_for_rag(sql_data).await;
    }

    // Build SQL query to get comprehensive data
    let time_filter =
        time_range.unwrap_or_else(|| "f.timestamp > datetime('now', '-30 days')".to_string());

    // Check if this is a time usage query
    let is_time_usage_query = time_filter.to_lowercase().contains("month")
        || time_filter.to_lowercase().contains("time")
        || time_filter.to_lowercase().contains("usage");

    let query = if is_time_usage_query {
        // For time usage queries, get aggregated data with better time calculation
        format!(
            r#"
            SELECT 
                f.app_name,
                COUNT(*) as frame_count,
                MIN(f.timestamp) as first_seen,
                MAX(f.timestamp) as last_seen,
                ROUND((JULIANDAY(MAX(f.timestamp)) - JULIANDAY(MIN(f.timestamp))) * 24 * 60, 2) as total_span_minutes,
                GROUP_CONCAT(DISTINCT f.window_name) as window_names
            FROM frames f 
            WHERE {} 
            GROUP BY f.app_name
            ORDER BY frame_count DESC
            LIMIT 50;
            "#,
            time_filter
        )
    } else {
        // For regular queries, get detailed data
        format!(
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
                o.text_length AS ocr_text_length
            FROM frames f 
            LEFT JOIN audio_chunks ac ON f.video_chunk_id = ac.id 
            LEFT JOIN audio_transcriptions at ON at.audio_chunk_id = ac.id 
            LEFT JOIN ocr_text o ON o.frame_id = f.id 
            WHERE {} 
            ORDER BY f.timestamp DESC 
            LIMIT 1000;
            "#,
            time_filter
        )
    };

    println!("[RAG] Sending SQL query to localhost:3030");
    let response = client
        .post("http://localhost:3030/raw_sql")
        .header("Content-Type", "application/json")
        .timeout(std::time::Duration::from_secs(60))
        .json(&serde_json::json!({ "query": query }))
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to send SQL query: {}", e))?;

    if !response.status().is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(anyhow::anyhow!("SQL API error: {}", error_text));
    }

    let sql_data: Vec<serde_json::Value> = response
        .json()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to parse SQL response: {}", e))?;

    // Print SQL query results for debugging
    println!("=== SQL QUERY RESULTS ===");
    println!("Total rows returned: {}", sql_data.len());
    if !sql_data.is_empty() {
        println!("First row sample:");
        println!("{:#?}", sql_data[0]);

        if sql_data.len() > 1 {
            println!("Last row sample:");
            println!("{:#?}", sql_data[sql_data.len() - 1]);
        }

        // Print column names from first row
        if let Some(first_row) = sql_data.first() {
            if let Some(obj) = first_row.as_object() {
                println!("Columns available:");
                for (key, _) in obj {
                    println!("  - {}", key);
                }
            }
        }
    } else {
        println!("No data returned from SQL query");
    }
    println!("=== END SQL RESULTS ===");

    // Initialize RAG system if not already initialized
    {
        let mut rag_system = RAG_SYSTEM.lock().unwrap();
        if rag_system.is_none() {
            *rag_system = Some(RAGSystem::new());
            println!("[RAG] Initialized new RAG system");
        }
    }

    // Convert SQL data to RAG chunks
    let mut total_chunks = 0;
    let mut ocr_chunks = 0;
    let mut audio_chunks = 0;
    let mut app_chunks = 0;

    println!("[RAG] Processing {} SQL rows for ingestion", sql_data.len());

    // Pre-calculate statistics for better context
    let mut app_stats = std::collections::HashMap::new();
    let mut website_stats = std::collections::HashMap::new();
    let mut audio_stats = std::collections::HashMap::new();
    let mut time_periods = Vec::new();

    // First pass: collect statistics
    for row in &sql_data {
        let app_name = row["app_name"].as_str().unwrap_or("Unknown");
        let timestamp = row["timestamp"].as_str().unwrap_or("");
        let window_name = row["window_name"].as_str().unwrap_or("");
        let browser_url = row["browser_url"].as_str().unwrap_or("");
        let transcription = row["transcription"].as_str().unwrap_or("");
        let _ocr_text = row["ocr_text"].as_str().unwrap_or(""); // Prefix with underscore to suppress warning

        // App usage statistics
        let app_entry = app_stats
            .entry(app_name.to_string())
            .or_insert_with(|| std::collections::HashMap::new());
        *app_entry.entry("count".to_string()).or_insert(0) += 1;

        // Store unique windows count
        let windows_count = app_entry.entry("windows_count".to_string()).or_insert(0);
        if !window_name.is_empty() {
            *windows_count += 1;
        }

        // Website statistics
        if !browser_url.is_empty() {
            if let Some(domain) = extract_domain(browser_url) {
                let website_entry = website_stats.entry(domain).or_insert(0);
                *website_entry += 1;
            }
        }

        // Audio statistics
        if !transcription.is_empty() {
            let audio_entry = audio_stats.entry(app_name.to_string()).or_insert(0);
            *audio_entry += 1;
        }

        // Time periods
        if !timestamp.is_empty() {
            time_periods.push(timestamp.to_string());
        }
    }

    // Calculate time range
    let time_range_text = if time_periods.len() >= 2 {
        let mut sorted_times = time_periods.clone();
        sorted_times.sort();
        format!(
            "{} to {}",
            sorted_times.first().unwrap(),
            sorted_times.last().unwrap()
        )
    } else {
        "Unknown time period".to_string()
    };

    // Check if we have aggregated data (time usage query)
    if !sql_data.is_empty() && sql_data[0].get("frame_count").is_some() {
        // Process aggregated time usage data
        println!("[RAG] Processing aggregated time usage data");

        // Calculate total screen time from individual app data
        let mut total_frames = 0;
        let mut total_span_minutes = 0.0;
        let mut all_first_seen = Vec::new();
        let mut all_last_seen = Vec::new();

        for (index, row) in sql_data.iter().enumerate() {
            if let Some(app_name) = row["app_name"].as_str() {
                // Process individual app data
                let frame_count = row["frame_count"].as_u64().unwrap_or(0);
                let total_span_minutes_app = row["total_span_minutes"].as_f64().unwrap_or(0.0);
                let first_seen = row["first_seen"].as_str().unwrap_or("Unknown");
                let last_seen = row["last_seen"].as_str().unwrap_or("Unknown");
                let window_names = row["window_names"].as_str().unwrap_or("Unknown");

                // Accumulate totals for overall summary
                total_frames += frame_count;
                total_span_minutes += total_span_minutes_app;
                if first_seen != "Unknown" {
                    all_first_seen.push(first_seen.to_string());
                }
                if last_seen != "Unknown" {
                    all_last_seen.push(last_seen.to_string());
                }

                // Estimate active time (simplified calculation)
                let estimated_active_minutes = total_span_minutes_app * 0.25; // Assume 25% active usage

                let usage_text = format!(
                    "App: {} - Estimated Active Time: {:.1} minutes ({:.1} hours) - Total Span: {:.1} minutes - Frames: {} - Period: {} to {} - Windows: {}",
                    app_name, estimated_active_minutes, estimated_active_minutes / 60.0, total_span_minutes_app, frame_count, first_seen, last_seen, window_names
                );

                let metadata = serde_json::json!({
                    "app_name": app_name,
                    "estimated_active_minutes": estimated_active_minutes,
                    "total_span_minutes": total_span_minutes_app,
                    "frame_count": frame_count,
                    "first_seen": first_seen,
                    "last_seen": last_seen,
                    "source_type": "time_usage"
                });

                let chunks = {
                    let rag_system = RAG_SYSTEM.lock().unwrap();
                    if let Some(ref system) = *rag_system {
                        system.chunk_text(&usage_text, "time_usage", index, &metadata)?
                    } else {
                        return Err(anyhow::anyhow!("RAG system not initialized"));
                    }
                };

                {
                    let mut rag_system = RAG_SYSTEM.lock().unwrap();
                    if let Some(ref mut system) = *rag_system {
                        system.chunks.extend(chunks);
                    }
                }
                app_chunks += 1;
                total_chunks += 1;
            }
        }

        // Create total screen time summary
        if !sql_data.is_empty() {
            let unknown_str = "Unknown".to_string();
            let overall_first_seen = all_first_seen.iter().min().unwrap_or(&unknown_str);
            let overall_last_seen = all_last_seen.iter().max().unwrap_or(&unknown_str);
            let unique_apps_used = sql_data.len() as u64;
            let total_active_minutes = total_span_minutes * 0.25; // Assume 25% active usage

            let total_screen_text = format!(
                "TOTAL SCREEN TIME SUMMARY - Total Active Time: {:.1} minutes ({:.1} hours) - Total Span: {:.1} minutes - Total Frames: {} - Period: {} to {} - Unique Apps Used: {}",
                total_active_minutes, total_active_minutes / 60.0, total_span_minutes, total_frames, overall_first_seen, overall_last_seen, unique_apps_used
            );

            let metadata = serde_json::json!({
                "app_name": "TOTAL_SCREEN_TIME",
                "total_active_minutes": total_active_minutes,
                "total_span_minutes": total_span_minutes,
                "total_frames": total_frames,
                "overall_first_seen": overall_first_seen,
                "overall_last_seen": overall_last_seen,
                "unique_apps_used": unique_apps_used,
                "source_type": "total_screen_time"
            });

            let chunks = {
                let rag_system = RAG_SYSTEM.lock().unwrap();
                if let Some(ref system) = *rag_system {
                    system.chunk_text(&total_screen_text, "total_screen_time", 0, &metadata)?
                } else {
                    return Err(anyhow::anyhow!("RAG system not initialized"));
                }
            };

            {
                let mut rag_system = RAG_SYSTEM.lock().unwrap();
                if let Some(ref mut system) = *rag_system {
                    system.chunks.extend(chunks);
                }
            }
            total_chunks += 1;
        }

        println!("[RAG] Ingestion Summary:");
        println!("[RAG]   Total apps processed: {}", sql_data.len());
        println!("[RAG]   Time usage chunks created: {}", app_chunks);
        println!("[RAG]   Total chunks: {}", total_chunks);

        return Ok(format!(
            "Successfully ingested {} time usage chunks into RAG system",
            total_chunks
        ));
    }

    // Create summary chunks
    let mut summary_chunks = Vec::new();

    // App usage summary
    let mut app_summary_parts = Vec::new();
    for (app_name, stats) in &app_stats {
        let count = stats.get("count").unwrap_or(&0);
        let windows_count = stats.get("windows_count").unwrap_or(&0);
        app_summary_parts.push(format!(
            "{} ({} frames, {} windows)",
            app_name, count, windows_count
        ));
    }
    app_summary_parts.sort_by(|a, b| {
        let count_a = a
            .split('(')
            .nth(1)
            .unwrap_or("0")
            .split(' ')
            .next()
            .unwrap_or("0")
            .parse::<i32>()
            .unwrap_or(0);
        let count_b = b
            .split('(')
            .nth(1)
            .unwrap_or("0")
            .split(' ')
            .next()
            .unwrap_or("0")
            .parse::<i32>()
            .unwrap_or(0);
        count_b.cmp(&count_a)
    });

    let app_summary = format!(
        "App Usage Summary ({} apps): {}",
        app_stats.len(),
        app_summary_parts
            .iter()
            .take(10)
            .cloned()
            .collect::<Vec<_>>()
            .join(", ")
    );

    let app_summary_metadata = serde_json::json!({
        "source_type": "app_summary",
        "total_apps": app_stats.len(),
        "time_range": time_range_text
    });

    summary_chunks.push((app_summary, app_summary_metadata));

    // Website usage summary
    if !website_stats.is_empty() {
        let mut website_list: Vec<_> = website_stats.iter().collect();
        website_list.sort_by(|a, b| b.1.cmp(a.1));

        let website_summary = format!(
            "Website Usage ({} domains): {}",
            website_stats.len(),
            website_list
                .iter()
                .take(10)
                .map(|(domain, count)| format!("{} ({} visits)", domain, count))
                .collect::<Vec<_>>()
                .join(", ")
        );

        let website_summary_metadata = serde_json::json!({
            "source_type": "website_summary",
            "total_domains": website_stats.len(),
            "time_range": time_range_text
        });

        summary_chunks.push((website_summary, website_summary_metadata));
    }

    // Audio activity summary
    if !audio_stats.is_empty() {
        let mut audio_list: Vec<_> = audio_stats.iter().collect();
        audio_list.sort_by(|a, b| b.1.cmp(a.1));

        let audio_summary = format!(
            "Audio Activity ({} apps with audio): {}",
            audio_stats.len(),
            audio_list
                .iter()
                .take(5)
                .map(|(app, count)| format!("{} ({} audio clips)", app, count))
                .collect::<Vec<_>>()
                .join(", ")
        );

        let audio_summary_metadata = serde_json::json!({
            "source_type": "audio_summary",
            "total_audio_apps": audio_stats.len(),
            "time_range": time_range_text
        });

        summary_chunks.push((audio_summary, audio_summary_metadata));
    }

    // Add summary chunks to RAG system
    for (summary_text, metadata) in summary_chunks {
        let chunks = {
            let rag_system = RAG_SYSTEM.lock().unwrap();
            if let Some(ref system) = *rag_system {
                system.chunk_text(&summary_text, "summary", 0, &metadata)?
            } else {
                return Err(anyhow::anyhow!("RAG system not initialized"));
            }
        };

        {
            let mut rag_system = RAG_SYSTEM.lock().unwrap();
            if let Some(ref mut system) = *rag_system {
                system.chunks.extend(chunks);
            }
        }
        total_chunks += 1;
    }

    // Process individual rows for detailed context
    for (index, row) in sql_data.iter().enumerate() {
        // Process OCR text with enhanced context
        if let Some(ocr_text) = row["ocr_text"].as_str() {
            if !ocr_text.is_empty() {
                let enhanced_text = format!(
                    "OCR from {}: {}",
                    row["app_name"].as_str().unwrap_or("Unknown"),
                    ocr_text
                );

                let metadata = serde_json::json!({
                    "app_name": row["app_name"].as_str().unwrap_or("Unknown"),
                    "timestamp": row["timestamp"].as_str(),
                    "window_name": row["window_name"].as_str(),
                    "browser_url": row["browser_url"].as_str().unwrap_or(""),
                    "source_type": "ocr",
                    "ocr_length": row["ocr_text_length"].as_u64().unwrap_or(0)
                });

                let chunks = {
                    let rag_system = RAG_SYSTEM.lock().unwrap();
                    if let Some(ref system) = *rag_system {
                        system.chunk_text(&enhanced_text, "ocr", index, &metadata)?
                    } else {
                        return Err(anyhow::anyhow!("RAG system not initialized"));
                    }
                };

                {
                    let mut rag_system = RAG_SYSTEM.lock().unwrap();
                    if let Some(ref mut system) = *rag_system {
                        system.chunks.extend(chunks);
                    }
                }
                ocr_chunks += 1;
                total_chunks += 1;
            }
        }

        // Process audio transcriptions with enhanced context
        if let Some(transcription) = row["transcription"].as_str() {
            if !transcription.is_empty() {
                let enhanced_text = format!(
                    "Audio from {} ({}): {}",
                    row["app_name"].as_str().unwrap_or("Unknown"),
                    row["device"].as_str().unwrap_or("Unknown"),
                    transcription
                );

                let metadata = serde_json::json!({
                    "app_name": row["app_name"].as_str().unwrap_or("Unknown"),
                    "timestamp": row["timestamp"].as_str(),
                    "speaker_id": row["device"].as_str(),
                    "transcription_engine": row["transcription_engine"].as_str().unwrap_or("Unknown"),
                    "start_time": row["start_time"].as_f64(),
                    "end_time": row["end_time"].as_f64(),
                    "source_type": "audio"
                });

                let chunks = {
                    let rag_system = RAG_SYSTEM.lock().unwrap();
                    if let Some(ref system) = *rag_system {
                        system.chunk_text(&enhanced_text, "audio", index, &metadata)?
                    } else {
                        return Err(anyhow::anyhow!("RAG system not initialized"));
                    }
                };

                {
                    let mut rag_system = RAG_SYSTEM.lock().unwrap();
                    if let Some(ref mut system) = *rag_system {
                        system.chunks.extend(chunks);
                    }
                }
                audio_chunks += 1;
                total_chunks += 1;
            }
        }

        // Process app usage patterns with enhanced context
        if let Some(app_name) = row["app_name"].as_str() {
            if !app_name.is_empty() {
                let browser_url = row["browser_url"].as_str().unwrap_or("");
                let url_info = if !browser_url.is_empty() {
                    format!(" - URL: {}", browser_url)
                } else {
                    "".to_string()
                };

                let enhanced_text = format!(
                    "App Activity: {} - Window: {} - Timestamp: {}{}",
                    app_name,
                    row["window_name"].as_str().unwrap_or("Unknown"),
                    row["timestamp"].as_str().unwrap_or("Unknown"),
                    url_info
                );

                let metadata = serde_json::json!({
                    "app_name": app_name,
                    "timestamp": row["timestamp"].as_str(),
                    "window_name": row["window_name"].as_str(),
                    "browser_url": browser_url,
                    "frame_id": row["frame_id"].as_u64(),
                    "source_type": "app_usage"
                });

                let chunks = {
                    let rag_system = RAG_SYSTEM.lock().unwrap();
                    if let Some(ref system) = *rag_system {
                        system.chunk_text(&enhanced_text, "app_usage", index, &metadata)?
                    } else {
                        return Err(anyhow::anyhow!("RAG system not initialized"));
                    }
                };

                {
                    let mut rag_system = RAG_SYSTEM.lock().unwrap();
                    if let Some(ref mut system) = *rag_system {
                        system.chunks.extend(chunks);
                    }
                }
                app_chunks += 1;
                total_chunks += 1;
            }
        }

        // Progress logging every 1000 rows
        if (index + 1) % 1000 == 0 {
            println!("[RAG] Processed {} rows...", index + 1);
        }
    }

    println!("[RAG] Ingestion Summary:");
    println!("[RAG]   Total rows processed: {}", sql_data.len());
    println!("[RAG]   OCR chunks created: {}", ocr_chunks);
    println!("[RAG]   Audio chunks created: {}", audio_chunks);
    println!("[RAG]   App usage chunks created: {}", app_chunks);
    println!("[RAG]   Total chunks: {}", total_chunks);

    println!(
        "[RAG] Successfully ingested {} chunks into global RAG system",
        total_chunks
    );

    Ok(format!(
        "Successfully ingested {} data chunks into RAG system",
        total_chunks
    ))
}

// Helper function to extract domain from URL
fn extract_domain(url: &str) -> Option<String> {
    if url.starts_with("http://") || url.starts_with("https://") {
        url.split("//")
            .nth(1)?
            .split("/")
            .next()
            .map(|s| s.to_string())
    } else {
        None
    }
}

// Helper function to process SQL data for RAG ingestion
async fn process_sql_data_for_rag(sql_data: Vec<serde_json::Value>) -> Result<String> {
    // Initialize RAG system if not already initialized
    {
        let mut rag_system = RAG_SYSTEM.lock().unwrap();
        if rag_system.is_none() {
            *rag_system = Some(RAGSystem::new());
            println!("[RAG] Initialized new RAG system");
        }
    }

    // Convert SQL data to RAG chunks
    let mut total_chunks = 0;
    let mut ocr_chunks = 0;
    let mut audio_chunks = 0;
    let mut app_chunks = 0;

    println!("[RAG] Processing {} SQL rows for ingestion", sql_data.len());

    // Process individual rows for detailed context
    for (index, row) in sql_data.iter().enumerate() {
        // Process OCR text with enhanced context
        if let Some(ocr_text) = row["ocr_text"].as_str() {
            if !ocr_text.is_empty() {
                let enhanced_text = format!(
                    "OCR from {}: {}",
                    row["app_name"].as_str().unwrap_or("Unknown"),
                    ocr_text
                );

                let metadata = serde_json::json!({
                    "app_name": row["app_name"].as_str().unwrap_or("Unknown"),
                    "timestamp": row["timestamp"].as_str(),
                    "window_name": row["window_name"].as_str(),
                    "browser_url": row["browser_url"].as_str().unwrap_or(""),
                    "source_type": "ocr",
                    "ocr_length": row["ocr_text_length"].as_u64().unwrap_or(0)
                });

                let chunks = {
                    let rag_system = RAG_SYSTEM.lock().unwrap();
                    if let Some(ref system) = *rag_system {
                        system.chunk_text(&enhanced_text, "ocr", index, &metadata)?
                    } else {
                        return Err(anyhow::anyhow!("RAG system not initialized"));
                    }
                };

                {
                    let mut rag_system = RAG_SYSTEM.lock().unwrap();
                    if let Some(ref mut system) = *rag_system {
                        system.chunks.extend(chunks);
                    }
                }
                ocr_chunks += 1;
                total_chunks += 1;
            }
        }

        // Process audio transcriptions with enhanced context
        if let Some(transcription) = row["transcription"].as_str() {
            if !transcription.is_empty() {
                let enhanced_text = format!(
                    "Audio from {} ({}): {}",
                    row["app_name"].as_str().unwrap_or("Unknown"),
                    row["device"].as_str().unwrap_or("Unknown"),
                    transcription
                );

                let metadata = serde_json::json!({
                    "app_name": row["app_name"].as_str().unwrap_or("Unknown"),
                    "timestamp": row["timestamp"].as_str(),
                    "speaker_id": row["device"].as_str(),
                    "transcription_engine": row["transcription_engine"].as_str().unwrap_or("Unknown"),
                    "start_time": row["start_time"].as_f64(),
                    "end_time": row["end_time"].as_f64(),
                    "source_type": "audio"
                });

                let chunks = {
                    let rag_system = RAG_SYSTEM.lock().unwrap();
                    if let Some(ref system) = *rag_system {
                        system.chunk_text(&enhanced_text, "audio", index, &metadata)?
                    } else {
                        return Err(anyhow::anyhow!("RAG system not initialized"));
                    }
                };

                {
                    let mut rag_system = RAG_SYSTEM.lock().unwrap();
                    if let Some(ref mut system) = *rag_system {
                        system.chunks.extend(chunks);
                    }
                }
                audio_chunks += 1;
                total_chunks += 1;
            }
        }

        // Process app usage patterns with enhanced context
        if let Some(app_name) = row["app_name"].as_str() {
            if !app_name.is_empty() {
                let browser_url = row["browser_url"].as_str().unwrap_or("");
                let url_info = if !browser_url.is_empty() {
                    format!(" - URL: {}", browser_url)
                } else {
                    "".to_string()
                };

                let enhanced_text = format!(
                    "App Activity: {} - Window: {} - Timestamp: {}{}",
                    app_name,
                    row["window_name"].as_str().unwrap_or("Unknown"),
                    row["timestamp"].as_str().unwrap_or("Unknown"),
                    url_info
                );

                let metadata = serde_json::json!({
                    "app_name": app_name,
                    "timestamp": row["timestamp"].as_str(),
                    "window_name": row["window_name"].as_str(),
                    "browser_url": browser_url,
                    "frame_id": row["frame_id"].as_u64(),
                    "source_type": "app_usage"
                });

                let chunks = {
                    let rag_system = RAG_SYSTEM.lock().unwrap();
                    if let Some(ref system) = *rag_system {
                        system.chunk_text(&enhanced_text, "app_usage", index, &metadata)?
                    } else {
                        return Err(anyhow::anyhow!("RAG system not initialized"));
                    }
                };

                {
                    let mut rag_system = RAG_SYSTEM.lock().unwrap();
                    if let Some(ref mut system) = *rag_system {
                        system.chunks.extend(chunks);
                    }
                }
                app_chunks += 1;
                total_chunks += 1;
            }
        }

        // Progress logging every 1000 rows
        if (index + 1) % 1000 == 0 {
            println!("[RAG] Processed {} rows...", index + 1);
        }
    }

    println!("[RAG] Ingestion Summary:");
    println!("[RAG]   Total rows processed: {}", sql_data.len());
    println!("[RAG]   OCR chunks created: {}", ocr_chunks);
    println!("[RAG]   Audio chunks created: {}", audio_chunks);
    println!("[RAG]   App usage chunks created: {}", app_chunks);
    println!("[RAG]   Total chunks: {}", total_chunks);

    println!(
        "[RAG] Successfully ingested {} chunks into global RAG system",
        total_chunks
    );

    Ok(format!(
        "Successfully ingested {} data chunks into RAG system",
        total_chunks
    ))
}

// Pure Rust analysis function without AI dependency
pub async fn perform_pure_rust_analysis(time_range: Option<(String, String)>) -> Result<String> {
    // Build the comprehensive SQL query with time range filtering
    let where_condition = if let Some((start, end)) = time_range {
        format!(
            "f.timestamp >= datetime('{}') AND f.timestamp <= datetime('{}')",
            start, end
        )
    } else {
        "f.timestamp > datetime('now', '-1 day')".to_string()
    };

    let sql_query = format!(
        "SELECT f.id AS frame_id, f.timestamp, f.name AS video_file, f.window_name, f.app_name, f.browser_url, ac.file_path AS audio_file, at.transcription, at.device, at.is_input_device, at.transcription_engine, at.start_time, at.end_time, o.text AS ocr_text, o.text_length AS ocr_text_length, COUNT(*) OVER () AS total_count FROM frames f LEFT JOIN audio_chunks ac ON f.video_chunk_id = ac.id LEFT JOIN audio_transcriptions at ON at.audio_chunk_id = ac.id LEFT JOIN ocr_text o ON o.frame_id = f.id WHERE {} ORDER BY f.timestamp DESC LIMIT 10000;",
        where_condition
    );

    println!("[PURE_RUST] Executing SQL query: {}", sql_query);

    // Fetch data from screenpipe API
    let response = reqwest::Client::new()
        .post("http://localhost:3030/raw_sql")
        .json(&serde_json::json!({ "query": sql_query }))
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to send SQL request: {}", e))?;

    if !response.status().is_success() {
        return Err(anyhow::anyhow!(
            "SQL query failed with status: {}",
            response.status()
        ));
    }

    let sql_data: Vec<serde_json::Value> = response
        .json()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to parse SQL response: {}", e))?;

    println!(
        "[PURE_RUST] Retrieved {} rows from database",
        sql_data.len()
    );

    if sql_data.is_empty() {
        return Ok("No data available for the selected time range".to_string());
    }

    // Perform pure Rust statistical analysis
    let analysis = analyze_sql_data_statistically(&sql_data)?;

    Ok(analysis)
}

fn analyze_sql_data_statistically(sql_data: &[serde_json::Value]) -> Result<String> {
    use std::collections::HashMap;

    // Data structures for analysis
    let mut app_usage = HashMap::new();
    let mut window_analysis = HashMap::new();
    let mut website_domains = HashMap::new();
    let mut website_time_tracking = HashMap::new(); // Track time spent on each website
    let mut productivity_indicators = HashMap::new();
    let mut time_distribution = HashMap::new();
    let mut ocr_content_analysis = HashMap::new();
    let mut audio_analysis = HashMap::new();
    let mut app_time_tracking = HashMap::new(); // Track time spent on each app

    let mut total_ocr_chars = 0;
    let mut total_audio_minutes = 0.0;
    let mut communication_indicators = 0;
    let mut coding_indicators = 0;
    let mut browser_usage = 0;
    let mut total_session_minutes = 0.0;
    let mut timestamps = Vec::new();

    // Track session start and end times
    let mut session_start: Option<String> = None;
    let mut session_end: Option<String> = None;

    // Process each row from the database
    for row in sql_data {
        let app_name = row["app_name"].as_str().unwrap_or("Unknown");
        let window_name = row["window_name"].as_str().unwrap_or("Unknown");
        let browser_url = row["browser_url"].as_str().unwrap_or("");
        let ocr_text = row["ocr_text"].as_str().unwrap_or("");
        let transcription = row["transcription"].as_str().unwrap_or("");
        let timestamp = row["timestamp"].as_str().unwrap_or("");
        let audio_start = row["start_time"].as_f64().unwrap_or(0.0);
        let audio_end = row["end_time"].as_f64().unwrap_or(0.0);

        // Track timestamps for session analysis
        if !timestamp.is_empty() {
            timestamps.push(timestamp.to_string());
            if session_start.is_none() {
                session_start = Some(timestamp.to_string());
            }
            session_end = Some(timestamp.to_string());
        }

        // App usage tracking
        let app_entry = app_usage
            .entry(app_name.to_string())
            .or_insert((0, 0, Vec::new()));
        app_entry.0 += 1; // count
        app_entry.1 += ocr_text.len() + transcription.len(); // content length

        // Track app time (estimate 1 minute per interaction)
        *app_time_tracking.entry(app_name.to_string()).or_insert(0.0) += 1.0;

        // Window analysis
        if !window_name.is_empty() && window_name != "Unknown" {
            *window_analysis
                .entry(format!("{} - {}", app_name, window_name))
                .or_insert(0) += 1;
        }

        // Website domain extraction and time tracking
        if !browser_url.is_empty() {
            browser_usage += 1;
            if let Some(domain) = extract_domain(browser_url) {
                *website_domains.entry(domain.clone()).or_insert(0) += 1;
                // Track time spent on each website (estimate 2 minutes per visit)
                *website_time_tracking.entry(domain).or_insert(0.0) += 2.0;
            }
        }

        // Time distribution (extract hour from timestamp)
        if !timestamp.is_empty() {
            if let Some(hour) = extract_hour_from_timestamp(timestamp) {
                *time_distribution.entry(hour).or_insert(0) += 1;
            }
        }

        // OCR content analysis
        if !ocr_text.is_empty() {
            total_ocr_chars += ocr_text.len();
            analyze_content_keywords(
                ocr_text,
                &mut productivity_indicators,
                &mut coding_indicators,
                &mut communication_indicators,
            );

            let content_type = classify_ocr_content(ocr_text);
            *ocr_content_analysis.entry(content_type).or_insert(0) += 1;
        }

        // Audio analysis
        if !transcription.is_empty() {
            let duration_minutes = (audio_end - audio_start) / 60.0;
            total_audio_minutes += duration_minutes;

            analyze_content_keywords(
                transcription,
                &mut productivity_indicators,
                &mut coding_indicators,
                &mut communication_indicators,
            );

            let audio_type = if transcription.to_lowercase().contains("meeting") {
                "meeting"
            } else if transcription.len() > 100 {
                "long_conversation"
            } else {
                "short_audio"
            };
            *audio_analysis.entry(audio_type.to_string()).or_insert(0) += 1;
        }
    }

    // Calculate total session time
    if let (Some(start), Some(end)) = (&session_start, &session_end) {
        if let (Ok(start_time), Ok(end_time)) = (parse_timestamp(start), parse_timestamp(end)) {
            total_session_minutes = (end_time - start_time) / 60.0;
        }
    }

    // Generate comprehensive analysis
    generate_statistical_report(
        sql_data.len(),
        &app_usage,
        &window_analysis,
        &website_domains,
        &website_time_tracking,
        &productivity_indicators,
        &time_distribution,
        &ocr_content_analysis,
        &audio_analysis,
        &app_time_tracking,
        total_ocr_chars,
        total_audio_minutes,
        total_session_minutes,
        browser_usage,
        coding_indicators,
        communication_indicators,
        &session_start,
        &session_end,
    )
}

fn analyze_content_keywords(
    content: &str,
    productivity_indicators: &mut HashMap<String, usize>,
    coding_indicators: &mut usize,
    communication_indicators: &mut usize,
) {
    let content_lower = content.to_lowercase();

    // Productivity keywords
    let productivity_keywords = [
        (
            "coding",
            vec![
                "function", "class", "import", "export", "const", "let", "var", "=>", "async",
                "await", "def", "return", "if", "else", "for", "while",
            ],
        ),
        (
            "communication",
            vec![
                "message", "email", "chat", "discord", "slack", "teams", "zoom", "call", "meeting",
                "hello", "hi", "thanks",
            ],
        ),
        (
            "documentation",
            vec![
                "readme",
                "docs",
                "wiki",
                "documentation",
                "manual",
                "guide",
                "tutorial",
                "help",
            ],
        ),
        (
            "research",
            vec![
                "stackoverflow",
                "github",
                "google",
                "search",
                "learn",
                "how to",
                "what is",
                "why",
            ],
        ),
        (
            "design",
            vec![
                "figma",
                "photoshop",
                "illustrator",
                "design",
                "ui",
                "ux",
                "interface",
                "layout",
            ],
        ),
        (
            "data",
            vec![
                "database",
                "sql",
                "query",
                "data",
                "analytics",
                "chart",
                "table",
                "select",
                "insert",
            ],
        ),
        (
            "productivity",
            vec![
                "todo", "task", "deadline", "project", "plan", "schedule", "calendar",
            ],
        ),
        (
            "debugging",
            vec![
                "error",
                "bug",
                "debug",
                "exception",
                "fix",
                "issue",
                "problem",
                "crash",
            ],
        ),
    ];

    for (category, keywords) in productivity_keywords.iter() {
        let matches = keywords
            .iter()
            .filter(|&&kw| content_lower.contains(kw))
            .count();
        if matches > 0 {
            *productivity_indicators
                .entry(category.to_string())
                .or_insert(0) += matches;

            if *category == "coding" || *category == "debugging" {
                *coding_indicators += matches;
            }
            if *category == "communication" {
                *communication_indicators += matches;
            }
        }
    }
}

fn classify_ocr_content(text: &str) -> String {
    let text_lower = text.to_lowercase();
    let word_count = text.split_whitespace().count();

    if text_lower.contains("error") || text_lower.contains("exception") {
        "error_messages".to_string()
    } else if word_count > 50 {
        "detailed_content".to_string()
    } else if word_count < 5 {
        "ui_elements".to_string()
    } else if text_lower.contains("http") {
        "web_content".to_string()
    } else {
        "general_text".to_string()
    }
}

fn extract_hour_from_timestamp(timestamp: &str) -> Option<u32> {
    // Extract hour from timestamp like "2025-01-30 14:30:00"
    if let Some(time_part) = timestamp.split(' ').nth(1) {
        if let Some(hour_str) = time_part.split(':').next() {
            return hour_str.parse().ok();
        }
    }
    None
}

fn parse_timestamp(timestamp: &str) -> Result<f64, Box<dyn std::error::Error>> {
    // Parse timestamp to Unix timestamp for time calculations
    use chrono::{DateTime, Utc};
    let dt: DateTime<Utc> = timestamp.parse()?;
    Ok(dt.timestamp() as f64)
}

fn generate_statistical_report(
    total_rows: usize,
    app_usage: &HashMap<String, (usize, usize, Vec<String>)>,
    _window_analysis: &HashMap<String, usize>,
    website_domains: &HashMap<String, usize>,
    website_time_tracking: &HashMap<String, f64>,
    productivity_indicators: &HashMap<String, usize>,
    time_distribution: &HashMap<u32, usize>,
    ocr_content_analysis: &HashMap<String, usize>,
    audio_analysis: &HashMap<String, usize>,
    app_time_tracking: &HashMap<String, f64>,
    total_ocr_chars: usize,
    total_audio_minutes: f64,
    total_session_minutes: f64,
    browser_usage: usize,
    coding_indicators: usize,
    communication_indicators: usize,
    _session_start: &Option<String>,
    _session_end: &Option<String>,
) -> Result<String> {
    let mut analysis = String::new();

    analysis.push_str("# 📊 **Activity Analysis Report**\n\n");
    analysis.push_str(&format!(
        "*Generated on {}*\n\n",
        chrono::Utc::now().format("%B %d, %Y at %I:%M %p UTC")
    ));

    // Quick Stats Overview
    analysis.push_str("## 📈 **Quick Stats**\n");
    analysis.push_str(&format!("**Total Activities**: {} records\n", total_rows));
    analysis.push_str(&format!("**Applications Used**: {}\n", app_usage.len()));
    analysis.push_str(&format!(
        "**Text Content**: {} characters\n",
        total_ocr_chars
    ));
    analysis.push_str(&format!(
        "**Audio Content**: {:.0} minutes\n",
        total_audio_minutes
    ));
    analysis.push_str(&format!("**Web Visits**: {}\n", browser_usage));

    // Session time information
    if total_session_minutes > 0.0 {
        analysis.push_str(&format!(
            "**Session Duration**: {:.0} minutes ({:.1} hours)\n",
            total_session_minutes,
            total_session_minutes / 60.0
        ));
    }
    analysis.push_str("\n");

    // 2. Most Used Applications
    analysis.push_str("## 💻 **Most Used Applications**\n");
    let mut sorted_apps: Vec<_> = app_usage.iter().collect();
    sorted_apps.sort_by(|a, b| b.1 .0.cmp(&a.1 .0));

    for (_i, (app, (count, _content_len, _))) in sorted_apps.iter().take(8).enumerate() {
        let percentage = (*count as f64 / total_rows as f64) * 100.0;
        analysis.push_str(&format!(
            "**{}** - {} activities ({:.0}%)\n",
            app, count, percentage
        ));
    }
    analysis.push_str("\n");

    // 3. Peak Activity Hours
    if !time_distribution.is_empty() {
        analysis.push_str("## ⏰ **Peak Activity Hours**\n");
        let mut sorted_hours: Vec<_> = time_distribution.iter().collect();
        sorted_hours.sort_by(|a, b| b.1.cmp(&a.1));

        for (hour, count) in sorted_hours.iter().take(5) {
            let percentage = (**count as f64 / total_rows as f64) * 100.0;
            analysis.push_str(&format!(
                "**{}:00** - {} activities ({:.0}%)\n",
                hour, count, percentage
            ));
        }
        analysis.push_str("\n");
    }

    // 4. Activity Types
    analysis.push_str("## 🎯 **Activity Types**\n");
    if !productivity_indicators.is_empty() {
        let mut sorted_productivity: Vec<_> = productivity_indicators.iter().collect();
        sorted_productivity.sort_by(|a, b| b.1.cmp(&a.1));

        for (category, count) in sorted_productivity.iter().take(6) {
            analysis.push_str(&format!(
                "**{}** - {} activities\n",
                category.replace("_", " ").to_title_case(),
                count
            ));
        }
    } else {
        analysis.push_str("No specific activity patterns detected\n");
    }
    analysis.push_str("\n");

    // 5. Content Overview
    analysis.push_str("## 📄 **Content Overview**\n");
    for (content_type, count) in ocr_content_analysis.iter() {
        let percentage = (*count as f64 / total_rows as f64) * 100.0;
        analysis.push_str(&format!(
            "**{}** - {} items ({:.0}%)\n",
            content_type.replace("_", " ").to_title_case(),
            count,
            percentage
        ));
    }

    if !audio_analysis.is_empty() {
        analysis.push_str("\n**Audio:**\n");
        for (audio_type, count) in audio_analysis.iter() {
            analysis.push_str(&format!(
                "**{}** - {} recordings\n",
                audio_type.replace("_", " ").to_title_case(),
                count
            ));
        }
    }
    analysis.push_str("\n");

    // 6. Time Breakdown
    if total_session_minutes > 0.0 {
        analysis.push_str("## ⏱️ **Time Breakdown**\n");
        analysis.push_str(&format!(
            "**Session Duration**: {:.0} minutes ({:.1} hours)\n",
            total_session_minutes,
            total_session_minutes / 60.0
        ));
        analysis.push_str(&format!(
            "**Activity Rate**: {:.0} activities per minute\n",
            total_rows as f64 / total_session_minutes
        ));
        analysis.push_str("\n");
    }

    // 7. App Time Usage
    if !app_time_tracking.is_empty() {
        analysis.push_str("## 🕐 **App Time Usage**\n");
        let mut sorted_app_time: Vec<_> = app_time_tracking.iter().collect();
        sorted_app_time.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

        for (_i, (app, minutes)) in sorted_app_time.iter().take(6).enumerate() {
            let percentage = (*minutes / total_session_minutes) * 100.0;
            analysis.push_str(&format!(
                "**{}** - {:.0} minutes ({:.0}%)\n",
                app, minutes, percentage
            ));
        }
        analysis.push_str("\n");
    }

    if !audio_analysis.is_empty() {
        analysis.push_str("\n**Audio Content:**\n");
        for (audio_type, count) in audio_analysis.iter() {
            analysis.push_str(&format!(
                "- **{}**: {} instances\n",
                audio_type.replace("_", " ").to_title_case(),
                count
            ));
        }
    }
    analysis.push_str("\n");

    // 8. Top Websites
    if !website_domains.is_empty() {
        analysis.push_str("## 🌐 **Top Websites**\n");
        let mut sorted_websites: Vec<_> = website_domains.iter().collect();
        sorted_websites.sort_by(|a, b| b.1.cmp(&a.1));

        for (_i, (domain, count)) in sorted_websites.iter().take(8).enumerate() {
            let time_spent = website_time_tracking.get(*domain).unwrap_or(&0.0);
            analysis.push_str(&format!(
                "**{}** - {} visits ({:.0} minutes)\n",
                domain, count, time_spent
            ));
        }
        analysis.push_str("\n");
    }

    // 9. Key Insights
    analysis.push_str("## 💡 **Key Insights**\n");

    if coding_indicators > 50 {
        analysis.push_str("🔧 **High Development Activity** - Extensive coding work detected\n");
    } else if coding_indicators > 15 {
        analysis.push_str("💻 **Moderate Development Activity** - Regular coding work\n");
    } else if coding_indicators > 0 {
        analysis.push_str("⚡ **Light Development Activity** - Some coding work\n");
    }

    if communication_indicators > 30 {
        analysis.push_str("💬 **High Communication** - Significant messaging/collaboration\n");
    } else if communication_indicators > 10 {
        analysis.push_str("📞 **Moderate Communication** - Regular interactions\n");
    }

    if total_audio_minutes > 60.0 {
        analysis.push_str(&format!(
            "🎤 **Audio Heavy Session** - {:.0} minutes of audio\n",
            total_audio_minutes
        ));
    }

    let avg_content_per_entry = if total_rows > 0 {
        total_ocr_chars / total_rows
    } else {
        0
    };
    if avg_content_per_entry > 200 {
        analysis.push_str("📄 **Content Rich** - High text content per activity\n");
    }

    if app_usage.len() > 8 {
        analysis.push_str("🔄 **Multi-Tasking** - Many applications used\n");
    } else if app_usage.len() < 4 {
        analysis.push_str("🎯 **Focused Work** - Limited app switching\n");
    }

    // 10. Summary
    analysis.push_str("\n## 📋 **Summary**\n");
    let primary_app = sorted_apps
        .first()
        .map(|(app, _)| app.as_str())
        .unwrap_or("Unknown");
    let primary_productivity = productivity_indicators
        .iter()
        .max_by_key(|(_, count)| *count)
        .map(|(cat, _)| cat.as_str())
        .unwrap_or("general");

    analysis.push_str(&format!("**Main App**: {}\n", primary_app));
    analysis.push_str(&format!(
        "**Primary Activity**: {}\n",
        primary_productivity.replace("_", " ").to_title_case()
    ));

    if coding_indicators > communication_indicators {
        analysis.push_str("**Session Type**: Development-focused work\n");
    } else if communication_indicators > coding_indicators {
        analysis.push_str("**Session Type**: Communication-heavy session\n");
    } else {
        analysis.push_str("**Session Type**: Mixed activities\n");
    }

    analysis.push_str(&format!(
        "\n*Analyzed {} activities across {} applications*",
        total_rows,
        app_usage.len()
    ));

    Ok(analysis)
}

// Helper trait for title case conversion
trait ToTitleCase {
    fn to_title_case(&self) -> String;
}

impl ToTitleCase for str {
    fn to_title_case(&self) -> String {
        self.split_whitespace()
            .map(|word| {
                let mut chars = word.chars();
                match chars.next() {
                    None => String::new(),
                    Some(first) => {
                        first.to_uppercase().collect::<String>() + &chars.as_str().to_lowercase()
                    }
                }
            })
            .collect::<Vec<_>>()
            .join(" ")
    }
}
