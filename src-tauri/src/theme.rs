use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// Information about an available theme
#[derive(Debug, Clone, Serialize)]
pub struct ThemeInfo {
    /// Display name of the theme
    pub name: String,
    /// Full path to the theme file
    pub path: String,
    /// Source location: "bundled" or "user"
    pub source: String,
    /// Theme type if detected from filename or content
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    pub theme_type: Option<String>,
}

/// Partial theme structure for extracting metadata
#[derive(Debug, Deserialize)]
struct ThemeMetadata {
    name: Option<String>,
    #[serde(rename = "type")]
    theme_type: Option<String>,
}

/// Get the path to bundled themes directory
fn get_bundled_themes_dir() -> Option<PathBuf> {
    // In development, themes are in the project root
    // In production, they're bundled as resources

    // Try resource path first (production)
    if let Ok(exe_path) = std::env::current_exe() {
        // On macOS, resources are in Contents/Resources
        #[cfg(target_os = "macos")]
        {
            if let Some(contents) = exe_path.parent().and_then(|p| p.parent()) {
                let resources = contents.join("Resources").join("themes");
                if resources.exists() {
                    return Some(resources);
                }
            }
        }

        // On Linux/Windows, resources are next to the executable
        #[cfg(not(target_os = "macos"))]
        {
            if let Some(exe_dir) = exe_path.parent() {
                let resources = exe_dir.join("themes");
                if resources.exists() {
                    return Some(resources);
                }
            }
        }
    }

    // Fallback to development path (project root)
    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    let project_root = Path::new(manifest_dir).parent()?;
    let themes_dir = project_root.join("themes");
    if themes_dir.exists() {
        return Some(themes_dir);
    }

    None
}

/// Get the path to user themes directory
fn get_user_themes_dir() -> Option<PathBuf> {
    let config_dir = dirs::home_dir()?.join(".config").join("shellflow").join("themes");
    Some(config_dir)
}

/// Extract theme name from a theme file
fn extract_theme_name(path: &Path) -> Option<String> {
    let content = std::fs::read_to_string(path).ok()?;

    // Strip JSON comments before parsing
    let mut json = content;
    json_strip_comments::strip(&mut json).ok()?;

    let metadata: ThemeMetadata = serde_json::from_str(&json).ok()?;
    metadata.name
}

/// Extract theme type from a theme file
fn extract_theme_type(path: &Path, content: Option<&str>) -> Option<String> {
    // Try to determine from filename first
    let filename = path.file_stem()?.to_str()?.to_lowercase();
    if filename.contains("light") || filename.contains("latte") {
        return Some("light".to_string());
    }
    if filename.contains("dark") || filename.contains("mocha") || filename.contains("frappe") || filename.contains("macchiato") {
        return Some("dark".to_string());
    }

    // Try to parse from content
    if let Some(content) = content {
        let mut json = content.to_string();
        if json_strip_comments::strip(&mut json).is_ok() {
            if let Ok(metadata) = serde_json::from_str::<ThemeMetadata>(&json) {
                return metadata.theme_type;
            }
        }
    } else if let Ok(content) = std::fs::read_to_string(path) {
        let mut json = content;
        if json_strip_comments::strip(&mut json).is_ok() {
            if let Ok(metadata) = serde_json::from_str::<ThemeMetadata>(&json) {
                return metadata.theme_type;
            }
        }
    }

    None
}

/// Recursively find all package.json files that might contain theme contributions
fn find_vscode_extensions(dir: &Path, max_depth: usize) -> Vec<PathBuf> {
    let mut results = Vec::new();
    find_vscode_extensions_recursive(dir, max_depth, 0, &mut results);
    results
}

fn find_vscode_extensions_recursive(dir: &Path, max_depth: usize, current_depth: usize, results: &mut Vec<PathBuf>) {
    if current_depth > max_depth || !dir.exists() {
        return;
    }

    let package_json = dir.join("package.json");
    if package_json.exists() {
        // Check if this package.json has theme contributions
        if let Ok(content) = std::fs::read_to_string(&package_json) {
            if content.contains("\"themes\"") && content.contains("\"contributes\"") {
                results.push(dir.to_path_buf());
                return; // Don't recurse further into this extension
            }
        }
    }

    // Recurse into subdirectories
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                // Skip common non-theme directories
                let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
                if name.starts_with('.') || name == "node_modules" || name == "dist" || name == "out" {
                    continue;
                }
                find_vscode_extensions_recursive(&path, max_depth, current_depth + 1, results);
            }
        }
    }
}

/// Scan a directory for theme files
fn scan_themes_dir(dir: &Path, source: &str) -> Vec<ThemeInfo> {
    let mut themes = Vec::new();

    if !dir.exists() {
        return themes;
    }

    // Find all VSCode extensions (package.json with theme contributions)
    let extensions = find_vscode_extensions(dir, 4); // Search up to 4 levels deep
    for ext_dir in extensions {
        if let Some(theme_infos) = scan_vscode_extension(&ext_dir, source) {
            themes.extend(theme_infos);
        }
    }

    // Also scan for loose theme files at the top level
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if is_theme_file(&path) {
                if let Some(info) = create_theme_info(&path, source) {
                    themes.push(info);
                }
            }
        }
    }

    themes
}

/// Check if a path is a theme file
fn is_theme_file(path: &Path) -> bool {
    if let Some(ext) = path.extension() {
        let ext = ext.to_str().unwrap_or("");
        if ext == "json" || ext == "jsonc" {
            // Exclude non-theme JSON files
            let filename = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
            return !filename.starts_with("package")
                && !filename.starts_with("tsconfig")
                && !filename.starts_with(".")
                && !filename.contains("settings")
                && !filename.contains("config");
        }
    }
    false
}

/// Create ThemeInfo from a theme file path
fn create_theme_info(path: &Path, source: &str) -> Option<ThemeInfo> {
    let name = extract_theme_name(path).or_else(|| {
        // Fallback to filename without extension
        path.file_stem()?.to_str().map(|s| {
            // Convert kebab-case to Title Case
            s.split('-')
                .map(|word| {
                    let mut chars = word.chars();
                    match chars.next() {
                        Some(c) => c.to_uppercase().chain(chars).collect::<String>(),
                        None => String::new(),
                    }
                })
                .collect::<Vec<_>>()
                .join(" ")
        })
    })?;

    let theme_type = extract_theme_type(path, None);

    Some(ThemeInfo {
        name,
        path: path.to_string_lossy().to_string(),
        source: source.to_string(),
        theme_type,
    })
}

/// Scan a VS Code extension directory for themes
fn scan_vscode_extension(dir: &Path, source: &str) -> Option<Vec<ThemeInfo>> {
    let package_json = dir.join("package.json");
    let content = std::fs::read_to_string(&package_json).ok()?;
    let package: serde_json::Value = serde_json::from_str(&content).ok()?;

    let contributes = package.get("contributes")?;
    let themes_array = contributes.get("themes")?.as_array()?;

    let mut themes = Vec::new();

    for theme in themes_array {
        let label = theme.get("label").and_then(|v| v.as_str());
        let theme_path = theme.get("path").and_then(|v| v.as_str())?;
        let ui_theme = theme.get("uiTheme").and_then(|v| v.as_str());

        let full_path = dir.join(theme_path);
        if !full_path.exists() {
            continue;
        }

        let name = label
            .map(|s| s.to_string())
            .or_else(|| extract_theme_name(&full_path))
            .or_else(|| {
                full_path.file_stem()?.to_str().map(|s| s.to_string())
            })?;

        // Determine theme type from uiTheme or file analysis
        let theme_type = match ui_theme {
            Some("vs") => Some("light".to_string()),
            Some("vs-dark") | Some("hc-black") => Some("dark".to_string()),
            Some("hc-light") => Some("light".to_string()),
            _ => extract_theme_type(&full_path, None),
        };

        themes.push(ThemeInfo {
            name,
            path: full_path.to_string_lossy().to_string(),
            source: source.to_string(),
            theme_type,
        });
    }

    if themes.is_empty() {
        None
    } else {
        Some(themes)
    }
}

/// List all available themes from bundled and user directories
#[tauri::command]
pub fn list_themes() -> Vec<ThemeInfo> {
    let mut themes = Vec::new();

    // Scan bundled themes
    if let Some(bundled_dir) = get_bundled_themes_dir() {
        themes.extend(scan_themes_dir(&bundled_dir, "bundled"));
    }

    // Scan user themes
    if let Some(user_dir) = get_user_themes_dir() {
        themes.extend(scan_themes_dir(&user_dir, "user"));
    }

    // Sort by name
    themes.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    themes
}

/// Read a theme file and return its contents
#[tauri::command]
pub fn read_theme(path: &str) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| format!("Failed to read theme file: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_theme_file() {
        assert!(is_theme_file(Path::new("mocha.json")));
        assert!(is_theme_file(Path::new("theme.jsonc")));
        assert!(!is_theme_file(Path::new("package.json")));
        assert!(!is_theme_file(Path::new("tsconfig.json")));
        assert!(!is_theme_file(Path::new(".hidden.json")));
        assert!(!is_theme_file(Path::new("settings.json")));
    }

    #[test]
    fn test_extract_theme_type_from_filename() {
        assert_eq!(
            extract_theme_type(Path::new("catppuccin-latte.json"), None),
            Some("light".to_string())
        );
        assert_eq!(
            extract_theme_type(Path::new("mocha.json"), None),
            Some("dark".to_string())
        );
        assert_eq!(
            extract_theme_type(Path::new("one-dark.json"), None),
            Some("dark".to_string())
        );
        assert_eq!(
            extract_theme_type(Path::new("github-light.json"), None),
            Some("light".to_string())
        );
    }
}
