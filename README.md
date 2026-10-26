# SysScope — Windows Process & Memory Monitor

SysScope is a lightweight Windows process and working-set memory monitor featuring both a high-performance **C++ CLI** and a modern, real-time **React UI**.

---

## Features

- **Live Process Monitoring**: Enumerates running processes with process IDs (PID), executable names, and working-set memory usage.
- **Modern React Dashboard**:
  - Real-time updates with configurable polling interval (1s, 2s, 5s, or paused).
  - Search & filter by process name or PID.
  - Sortable columns (PID, Name, Memory Usage).
  - System memory overview card (used RAM, total RAM, memory load percentage).
  - Filter pills (All, > 100 MB, > 500 MB, System/Restricted).
  - Visual memory impact bars for each process.
  - **End Process action**: Terminate processes directly with confirmation modal and safety warnings.
  - **Export to CSV**: One-click export of current snapshot to CSV format.
- **C++ Native Engine**: Uses Windows Tool Help API (`CreateToolhelp32Snapshot`) and PSAPI (`GetProcessMemoryInfo`).
- **Flexible Modes**: CLI table view, machine-readable JSON output (`--json`), process termination (`--kill <PID>`), or interactive React UI.

---

## Technologies Used

- **Core Engine**: C++, Windows API, PSAPI, Tool Help Library, MinGW GCC
- **Frontend UI**: React 19, Vite, Lucide Icons
- **Backend / Integration**: Node.js lightweight API bridge

---

## Quick Start (React UI)

### Option 1: Double-click Batch Launcher (Windows)
Double-click `start-ui.bat` in the project root. It will compile `sysscope.exe` if needed and automatically launch the React dashboard in your browser.

### Option 2: Using npm
From the project root:

```bash
# 1. Start the React UI dev server (runs on http://localhost:5173)
npm start

# 2. Or run directly inside the ui/ folder:
cd ui
npm run dev
```

### Option 3: Production Server
```bash
cd ui
npm run build
npm start
# UI is served on http://localhost:3000
```

---

## CLI Usage & Compilation

Compile the C++ core:

```bash
g++ -std=c++14 -Wall -Wextra src/main.cpp -o sysscope.exe -lpsapi
```

### Commands:

- **Standard Table Output**:
  ```powershell
  .\sysscope.exe
  ```

- **JSON Output** (used by the UI):
  ```powershell
  .\sysscope.exe --json
  ```

- **Terminate Process by PID**:
  ```powershell
  .\sysscope.exe --kill <PID>
  ```

---

## License
MIT
