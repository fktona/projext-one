use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct SystemCheckResult {
    pub ollama_installed: bool,
    pub screenpipe_installed: bool,
    pub screenpipe_running: bool,
    pub ollama_version: Option<String>,
    pub screenpipe_version: Option<String>,
    pub screenpipe_path: Option<String>,
    pub ram_ok: bool,
    pub total_ram_gb: u64,
    pub disk_ok: bool,
    pub free_disk_gb: u64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ExportProgress {
    pub total_items: u64,
    pub items_exported: u64,
    pub current_offset: u64,
    pub last_export_time: u64,
    pub is_complete: bool,
    pub batch_number: u32,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ExportState {
    pub last_offset: u64,
    pub total_items_known: u64,
    pub last_export_timestamp: u64,
    pub batch_number: u32,
    pub is_first_run: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ExportData {
    pub ocr: Vec<OcrData>,
    pub audio: Vec<AudioData>,
    pub ui: Vec<UiData>,
    pub all: Vec<serde_json::Value>,
    pub metadata: ExportMetadata,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct OcrData {
    pub text: String,
    pub app_name: String,
    pub window_name: String,
    pub timestamp: String,
    pub raw_content: serde_json::Value,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct AudioData {
    pub transcription: String,
    pub speaker_id: String,
    pub raw_content: serde_json::Value,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct UiData {
    pub element_type: String,
    pub raw_content: serde_json::Value,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ExportMetadata {
    pub export_date: String,
    pub start_date: String,
    pub end_date: String,
    pub total_items: usize,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct ScreenPipeResponse {
    pub data: Vec<ScreenPipeItem>,
    pub pagination: Pagination,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct Pagination {
    pub limit: u64,
    pub offset: u64,
    pub total: u64,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct ScreenPipeItem {
    pub id: Option<String>,
    #[serde(rename = "type")]
    pub content_type: String,
    pub content: serde_json::Value,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct ExportBatch {
    pub batch_number: u32,
    pub export_date: String,
    pub total_items: u64,
    pub ocr: Vec<serde_json::Value>,
    pub audio: Vec<serde_json::Value>,
    pub ui_interactions: Vec<serde_json::Value>,
    pub metadata: serde_json::Value,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct OpenAIRequest {
    pub model: String,
    pub messages: Vec<OpenAIMessage>,
    pub max_tokens: u32,
    pub temperature: f32,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct OpenAIMessage {
    pub role: String,
    pub content: String,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct OpenAIResponse {
    pub choices: Vec<OpenAIChoice>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct OpenAIChoice {
    pub message: OpenAIMessage,
}

// New structures for app discovery
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct SystemApp {
    pub name: String,
    pub display_name: Option<String>,
    pub executable_path: Option<String>,
    pub icon_path: Option<String>,
    pub version: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub is_system_app: bool,
    pub is_running: bool,
    pub install_date: Option<String>,
    pub publisher: Option<String>,
    pub size: Option<u64>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct AppDiscoveryResult {
    pub total_apps: usize,
    pub system_apps: Vec<SystemApp>,
    pub user_apps: Vec<SystemApp>,
    pub running_apps: Vec<SystemApp>,
    pub categories: Vec<String>,
    pub scan_time_ms: u64,
    pub errors: Vec<String>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct AppSearchResult {
    pub query: String,
    pub results: Vec<SystemApp>,
    pub total_found: usize,
    pub search_time_ms: u64,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct AppCategory {
    pub name: String,
    pub count: usize,
    pub apps: Vec<SystemApp>,
}
