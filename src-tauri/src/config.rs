use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct Config {
    pub main: MainConfig,
    pub terminal: TerminalConfig,
    pub worktree: WorktreeConfig,
    pub merge: MergeConfig,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Default, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum MergeStrategy {
    #[default]
    Merge,
    Rebase,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct MergeConfig {
    /// Merge strategy: "merge" or "rebase"
    pub strategy: MergeStrategy,
    /// Delete the worktree after successful merge (default: true)
    #[serde(rename = "deleteWorktree")]
    pub delete_worktree: bool,
    /// Delete the local branch after successful merge (default: false)
    #[serde(rename = "deleteLocalBranch")]
    pub delete_local_branch: bool,
    /// Delete the remote branch after successful merge (default: false)
    #[serde(rename = "deleteRemoteBranch")]
    pub delete_remote_branch: bool,
}

impl Default for MergeConfig {
    fn default() -> Self {
        Self {
            strategy: MergeStrategy::Merge,
            delete_worktree: true,
            delete_local_branch: false,
            delete_remote_branch: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct MainConfig {
    /// Command to run in the main terminal pane
    pub command: String,
    #[serde(rename = "fontFamily")]
    pub font_family: String,
    #[serde(rename = "fontSize")]
    pub font_size: u16,
}

impl Default for MainConfig {
    fn default() -> Self {
        Self {
            command: "claude".to_string(),
            font_family: "Menlo, Monaco, 'Courier New', monospace".to_string(),
            font_size: 13,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct WorktreeConfig {
    /// Directory where worktrees are created.
    /// Supports placeholder: {{ repo_directory }} (the repository directory)
    /// Final path: {directory}/{workspace_name}
    /// Default: {{ repo_directory }}/.worktrees
    pub directory: Option<String>,

    /// Configuration for copying files to new worktrees
    pub copy: CopyConfig,
}

impl Default for WorktreeConfig {
    fn default() -> Self {
        Self {
            directory: None,
            copy: CopyConfig::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct CopyConfig {
    /// Copy gitignored files from the project to new worktrees
    #[serde(rename = "gitIgnored")]
    pub gitignored: bool,

    /// Glob patterns to exclude from copying
    pub except: Vec<String>,
}

impl Default for CopyConfig {
    fn default() -> Self {
        Self {
            gitignored: false,
            except: vec![".claude".to_string(), ".worktrees".to_string()],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct TerminalConfig {
    #[serde(rename = "fontFamily")]
    pub font_family: String,
    #[serde(rename = "fontSize")]
    pub font_size: u16,
}

impl Default for TerminalConfig {
    fn default() -> Self {
        Self {
            font_family: "Menlo, Monaco, 'Courier New', monospace".to_string(),
            font_size: 13,
        }
    }
}

pub fn get_config_path() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("/tmp"))
        .join(".config")
        .join("onemanband")
        .join("config.jsonc")
}

pub fn load_config() -> Config {
    let config_path = get_config_path();

    if !config_path.exists() {
        // Create default config file
        if let Some(parent) = config_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let default_config = r#"{
  // One Man Band Configuration

  // Main terminal pane
  "main": {
    // Command to run (e.g., "claude", "aider", "cursor")
    "command": "claude",
    "fontFamily": "Menlo, Monaco, 'Courier New', monospace",
    "fontSize": 13
  },

  // Shell terminal (bottom-right pane)
  "terminal": {
    "fontFamily": "Menlo, Monaco, 'Courier New', monospace",
    "fontSize": 13
  },

  // Worktree settings
  "worktree": {
    // Directory for worktrees. Final path: {directory}/{workspace_name}
    // Supports placeholder: {{ repo_directory }} (the repo directory)
    // Default: "{{ repo_directory }}/.worktrees"
    "directory": null,

    // Copy settings for new worktrees
    "copy": {
      // Copy gitignored files (e.g., .env, node_modules)
      "gitIgnored": false,
      // Glob patterns to exclude from copying
      "except": [".claude", ".worktrees"]
    }
  },

  // Merge/rebase workflow settings
  "merge": {
    // Strategy: "merge" or "rebase"
    "strategy": "merge",
    // Delete worktree after successful merge
    "deleteWorktree": true,
    // Delete local branch after successful merge
    "deleteLocalBranch": false,
    // Delete remote branch after successful merge
    "deleteRemoteBranch": false
  }
}
"#;
        let _ = std::fs::write(&config_path, default_config);
        return Config::default();
    }

    match std::fs::read_to_string(&config_path) {
        Ok(content) => parse_jsonc(&content).unwrap_or_default(),
        Err(_) => Config::default(),
    }
}

fn parse_jsonc(content: &str) -> Option<Config> {
    // Strip comments from JSONC
    let mut result = String::new();
    let mut in_string = false;
    let mut escape_next = false;
    let mut chars = content.chars().peekable();

    while let Some(c) = chars.next() {
        if escape_next {
            result.push(c);
            escape_next = false;
            continue;
        }

        if c == '\\' && in_string {
            result.push(c);
            escape_next = true;
            continue;
        }

        if c == '"' {
            in_string = !in_string;
            result.push(c);
            continue;
        }

        if !in_string {
            if c == '/' {
                if chars.peek() == Some(&'/') {
                    // Single-line comment - skip to end of line
                    while let Some(nc) = chars.next() {
                        if nc == '\n' {
                            result.push('\n');
                            break;
                        }
                    }
                    continue;
                } else if chars.peek() == Some(&'*') {
                    // Multi-line comment - skip to */
                    chars.next(); // consume *
                    while let Some(nc) = chars.next() {
                        if nc == '*' && chars.peek() == Some(&'/') {
                            chars.next(); // consume /
                            break;
                        }
                    }
                    continue;
                }
            }
        }

        result.push(c);
    }

    // Remove trailing commas (before } or ])
    let result = remove_trailing_commas(&result);

    serde_json::from_str(&result).ok()
}

fn remove_trailing_commas(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let chars: Vec<char> = s.chars().collect();
    let mut i = 0;

    while i < chars.len() {
        if chars[i] == '"' {
            // Skip strings entirely
            result.push(chars[i]);
            i += 1;
            while i < chars.len() {
                result.push(chars[i]);
                if chars[i] == '\\' && i + 1 < chars.len() {
                    i += 1;
                    result.push(chars[i]);
                } else if chars[i] == '"' {
                    break;
                }
                i += 1;
            }
            i += 1;
        } else if chars[i] == ',' {
            // Look ahead for } or ] (skipping whitespace)
            let mut j = i + 1;
            while j < chars.len() && chars[j].is_whitespace() {
                j += 1;
            }
            if j < chars.len() && (chars[j] == '}' || chars[j] == ']') {
                // Skip this comma (trailing comma)
                i += 1;
            } else {
                result.push(chars[i]);
                i += 1;
            }
        } else {
            result.push(chars[i]);
            i += 1;
        }
    }

    result
}
