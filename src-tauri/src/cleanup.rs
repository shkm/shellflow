//! Process cleanup for crash recovery
//!
//! This module handles cleanup of orphaned PTY processes when the app crashes.
//! It provides:
//! - PID file persistence to track spawned processes (per-instance)
//! - Orphan cleanup on startup
//! - Panic handler for emergency cleanup
//! - Signal handlers (SIGTERM/SIGINT) for graceful shutdown
//!
//! Each app instance gets its own PID file at `~/.onemanband/pids/{app_pid}.json`.
//! This allows multiple instances to run simultaneously without interfering.

use crate::pty;
use crate::state::AppState;
use log::{error, info, warn};
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

/// PID file structure persisted to disk (one per app instance)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PidFile {
    /// PIDs of spawned PTY processes
    pub pty_pids: Vec<u32>,
    /// Unix timestamp when the file was last updated
    pub timestamp: u64,
}

lazy_static::lazy_static! {
    /// Lock for atomic PID file operations
    static ref PID_FILE_LOCK: Mutex<()> = Mutex::new(());
}

/// Get the pids directory path
fn get_pids_dir() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".onemanband")
        .join("pids")
}

/// Get the path to this instance's PID file
fn get_pid_file_path() -> PathBuf {
    get_pids_dir().join(format!("{}.json", std::process::id()))
}

/// Get current Unix timestamp
fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// Load a PID file from disk
fn load_pid_file(path: &PathBuf) -> Option<PidFile> {
    let content = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&content).ok()
}

/// Load this instance's PID file
fn load_own_pid_file() -> Option<PidFile> {
    load_pid_file(&get_pid_file_path())
}

/// Save the PID file to disk atomically (write to temp, then rename)
fn save_pid_file(pid_file: &PidFile) -> std::io::Result<()> {
    let path = get_pid_file_path();

    // Ensure pids directory exists
    let pids_dir = get_pids_dir();
    std::fs::create_dir_all(&pids_dir)?;

    // Write to temp file first
    let temp_path = path.with_extension("json.tmp");
    let content = serde_json::to_string_pretty(pid_file)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
    std::fs::write(&temp_path, content)?;

    // Atomic rename
    std::fs::rename(&temp_path, &path)?;

    Ok(())
}

/// Initialize the PID file for this instance
pub fn init_pid_file() {
    let _lock = PID_FILE_LOCK.lock();

    // Ensure pids directory exists
    if let Err(e) = std::fs::create_dir_all(get_pids_dir()) {
        warn!("[Cleanup] Failed to create pids directory: {}", e);
        return;
    }

    let pid_file = PidFile {
        pty_pids: Vec::new(),
        timestamp: current_timestamp(),
    };

    if let Err(e) = save_pid_file(&pid_file) {
        warn!("[Cleanup] Failed to initialize PID file: {}", e);
    } else {
        info!(
            "[Cleanup] Initialized PID file for instance {}",
            std::process::id()
        );
    }
}

/// Add a PID to the tracking file (called when PTY spawns)
pub fn add_pid(pid: u32) {
    let _lock = PID_FILE_LOCK.lock();

    let mut pid_file = load_own_pid_file().unwrap_or(PidFile {
        pty_pids: Vec::new(),
        timestamp: 0,
    });

    if !pid_file.pty_pids.contains(&pid) {
        pid_file.pty_pids.push(pid);
        pid_file.timestamp = current_timestamp();

        if let Err(e) = save_pid_file(&pid_file) {
            warn!("[Cleanup] Failed to add PID {} to file: {}", pid, e);
        }
    }
}

/// Remove a PID from the tracking file (called when PTY exits)
pub fn remove_pid(pid: u32) {
    let _lock = PID_FILE_LOCK.lock();

    if let Some(mut pid_file) = load_own_pid_file() {
        pid_file.pty_pids.retain(|&p| p != pid);
        pid_file.timestamp = current_timestamp();

        if let Err(e) = save_pid_file(&pid_file) {
            warn!("[Cleanup] Failed to remove PID {} from file: {}", pid, e);
        }
    }
}

/// Delete this instance's PID file (called on clean shutdown)
pub fn delete_pid_file() {
    let _lock = PID_FILE_LOCK.lock();

    let path = get_pid_file_path();
    if path.exists() {
        if let Err(e) = std::fs::remove_file(&path) {
            warn!("[Cleanup] Failed to delete PID file: {}", e);
        } else {
            info!("[Cleanup] Deleted PID file on clean shutdown");
        }
    }
}

/// Extract app PID from a PID file path (e.g., "12345.json" -> 12345)
fn app_pid_from_path(path: &PathBuf) -> Option<u32> {
    path.file_stem()
        .and_then(|s| s.to_str())
        .and_then(|s| s.parse().ok())
}

/// Clean up orphaned processes from previous crashes
///
/// Called early in app startup, before any PTYs are spawned.
/// Scans all PID files and cleans up any where the app is dead.
#[cfg(unix)]
pub fn cleanup_orphans() {
    let _lock = PID_FILE_LOCK.lock();

    let pids_dir = get_pids_dir();
    let entries = match std::fs::read_dir(&pids_dir) {
        Ok(e) => e,
        Err(_) => return, // Directory doesn't exist, nothing to clean up
    };

    let current_pid = std::process::id();

    for entry in entries.flatten() {
        let path = entry.path();

        // Skip non-JSON files
        if path.extension().map(|e| e != "json").unwrap_or(true) {
            continue;
        }

        // Extract the app PID from the filename
        let Some(app_pid) = app_pid_from_path(&path) else {
            continue;
        };

        // Skip our own PID file
        if app_pid == current_pid {
            continue;
        }

        // Check if the app that wrote this file is still running
        if pty::is_process_alive(app_pid) {
            info!(
                "[Cleanup] Skipping PID file for running instance {}",
                app_pid
            );
            continue;
        }

        // The old app is dead - load and clean up its orphaned processes
        let Some(pid_file) = load_pid_file(&path) else {
            // Can't parse file, just delete it
            let _ = std::fs::remove_file(&path);
            continue;
        };

        if pid_file.pty_pids.is_empty() {
            info!("[Cleanup] No orphaned PIDs from instance {}", app_pid);
            let _ = std::fs::remove_file(&path);
            continue;
        }

        info!(
            "[Cleanup] Found {} potentially orphaned PIDs from crashed instance {}",
            pid_file.pty_pids.len(),
            app_pid
        );

        for pid in &pid_file.pty_pids {
            if pty::is_process_alive(*pid) {
                // Kill children first
                let children = pty::get_child_pids(*pid);
                for child_pid in children {
                    if pty::is_process_alive(child_pid) {
                        pty::send_signal(child_pid, libc::SIGKILL);
                        info!("[Cleanup] Killed orphaned child process {}", child_pid);
                    }
                }
                // Then kill the parent
                pty::send_signal(*pid, libc::SIGKILL);
                info!("[Cleanup] Killed orphaned process {}", pid);
            }
        }

        // Remove the stale PID file
        let _ = std::fs::remove_file(&path);
        info!("[Cleanup] Cleaned up PID file for instance {}", app_pid);
    }
}

#[cfg(not(unix))]
pub fn cleanup_orphans() {
    // On non-Unix, just remove stale PID files for dead processes
    let pids_dir = get_pids_dir();
    let entries = match std::fs::read_dir(&pids_dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    let current_pid = std::process::id();

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().map(|e| e != "json").unwrap_or(true) {
            continue;
        }
        if let Some(app_pid) = app_pid_from_path(&path) {
            if app_pid != current_pid {
                // On non-Unix we can't check if process is alive easily,
                // so we just leave the files alone
            }
        }
    }
}

/// Emergency cleanup for panic/signal contexts
///
/// This is synchronous and uses SIGKILL directly (no time for graceful cascade).
/// Uses try_read() to avoid deadlock if panicking thread holds the lock.
#[cfg(unix)]
pub fn emergency_cleanup(state: &AppState) {
    info!("[Cleanup] Performing emergency cleanup...");

    // Try to read PIDs from memory - but don't block if lock is held
    if let Some(sessions) = state.pty_sessions.try_read() {
        for session in sessions.values() {
            let pid = session.child_pid;
            if pid > 0 && pty::is_process_alive(pid) {
                // Kill children first
                let children = pty::get_child_pids(pid);
                for child in children {
                    unsafe {
                        libc::kill(child as i32, libc::SIGKILL);
                    }
                }
                unsafe {
                    libc::kill(pid as i32, libc::SIGKILL);
                }
                info!("[Cleanup] Emergency killed PID {}", pid);
            }
        }
    } else {
        warn!("[Cleanup] Could not acquire session lock, falling back to PID file");
    }

    // Also try from our PID file as backup (in case we couldn't get the lock)
    if let Some(pid_file) = load_own_pid_file() {
        for pid in pid_file.pty_pids {
            if pty::is_process_alive(pid) {
                let children = pty::get_child_pids(pid);
                for child in children {
                    unsafe {
                        libc::kill(child as i32, libc::SIGKILL);
                    }
                }
                unsafe {
                    libc::kill(pid as i32, libc::SIGKILL);
                }
            }
        }
    }

    // Clean up our PID file
    let _ = std::fs::remove_file(get_pid_file_path());
    info!("[Cleanup] Emergency cleanup complete");
}

#[cfg(not(unix))]
pub fn emergency_cleanup(_state: &AppState) {
    let _ = std::fs::remove_file(get_pid_file_path());
}

/// Install a panic hook that attempts emergency cleanup
pub fn install_panic_hook(state: Arc<AppState>) {
    let default_hook = std::panic::take_hook();

    std::panic::set_hook(Box::new(move |panic_info| {
        error!("[Panic] Application panicked, attempting emergency cleanup...");
        emergency_cleanup(&state);

        // Call the default panic hook for proper panic handling/reporting
        default_hook(panic_info);
    }));

    info!("[Cleanup] Panic hook installed");
}

/// Install signal handlers for graceful shutdown on SIGTERM/SIGINT
#[cfg(unix)]
pub fn install_signal_handlers(state: Arc<AppState>) {
    use signal_hook::consts::{SIGINT, SIGTERM};
    use signal_hook::iterator::Signals;

    let state_clone = Arc::clone(&state);

    std::thread::spawn(move || {
        let mut signals = match Signals::new([SIGTERM, SIGINT]) {
            Ok(s) => s,
            Err(e) => {
                error!("[Signal] Failed to install signal handlers: {}", e);
                return;
            }
        };

        info!("[Signal] Signal handlers installed for SIGTERM and SIGINT");

        for sig in signals.forever() {
            info!("[Signal] Received signal {}, performing cleanup...", sig);

            // Mark shutdown in progress - if already shutting down, force exit
            if pty::SHUTDOWN_IN_PROGRESS.swap(true, std::sync::atomic::Ordering::SeqCst) {
                warn!("[Signal] Second signal received, forcing immediate exit");
                std::process::exit(1);
            }

            // Perform emergency cleanup
            emergency_cleanup(&state_clone);

            // Exit cleanly
            info!("[Signal] Cleanup complete, exiting");
            std::process::exit(0);
        }
    });
}

#[cfg(not(unix))]
pub fn install_signal_handlers(_state: Arc<AppState>) {
    // Signal handlers not available on non-Unix platforms
}

/// Spawn a watchdog process that monitors this app and cleans up if it dies
#[cfg(unix)]
pub fn spawn_watchdog() {
    use std::os::unix::process::CommandExt;
    use std::process::Command;

    let current_pid = std::process::id();
    let current_exe = match std::env::current_exe() {
        Ok(exe) => exe,
        Err(e) => {
            warn!("[Watchdog] Failed to get current exe path: {}", e);
            return;
        }
    };

    // Spawn ourselves with --watchdog flag as a detached process
    let mut cmd = Command::new(&current_exe);
    cmd.args(["--watchdog", &current_pid.to_string()]);

    // Detach from parent process group and session
    unsafe {
        cmd.pre_exec(|| {
            // Create new session so watchdog isn't killed with parent
            libc::setsid();
            Ok(())
        });
    }

    // Redirect stdio to /dev/null to fully detach
    cmd.stdin(std::process::Stdio::null());
    cmd.stdout(std::process::Stdio::null());
    cmd.stderr(std::process::Stdio::null());

    match cmd.spawn() {
        Ok(child) => {
            info!(
                "[Watchdog] Spawned watchdog process {} for parent {}",
                child.id(),
                current_pid
            );
        }
        Err(e) => {
            warn!("[Watchdog] Failed to spawn watchdog: {}", e);
        }
    }
}

#[cfg(not(unix))]
pub fn spawn_watchdog() {
    // Watchdog not implemented on non-Unix platforms
}

/// Run as a watchdog process - monitor parent and clean up when it dies
#[cfg(unix)]
pub fn run_watchdog(parent_pid: u32) {
    use std::thread;
    use std::time::Duration;

    // Small delay to let parent finish initializing
    thread::sleep(Duration::from_millis(500));

    // Poll until parent dies
    loop {
        if !pty::is_process_alive(parent_pid) {
            break;
        }
        thread::sleep(Duration::from_millis(500));
    }

    // Parent is dead - clean up its orphans
    let pid_file_path = get_pids_dir().join(format!("{}.json", parent_pid));

    if let Some(pid_file) = load_pid_file(&pid_file_path) {
        for pid in &pid_file.pty_pids {
            if pty::is_process_alive(*pid) {
                // Kill children first
                let children = pty::get_child_pids(*pid);
                for child_pid in children {
                    if pty::is_process_alive(child_pid) {
                        pty::send_signal(child_pid, libc::SIGKILL);
                    }
                }
                pty::send_signal(*pid, libc::SIGKILL);
            }
        }
    }

    // Remove the PID file
    let _ = std::fs::remove_file(&pid_file_path);
}

#[cfg(not(unix))]
pub fn run_watchdog(_parent_pid: u32) {
    // Watchdog not implemented on non-Unix platforms
}
