// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let args: Vec<String> = std::env::args().collect();

    // Check for watchdog mode: --watchdog <parent_pid>
    if args.len() == 3 && args[1] == "--watchdog" {
        if let Ok(ppid) = args[2].parse::<u32>() {
            onemanband_lib::run_watchdog(ppid);
            return;
        }
    }

    onemanband_lib::run()
}
