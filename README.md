\# SysScope — Windows Process \& Memory Monitor



SysScope is a lightweight C++ command-line utility that displays running Windows processes, their process IDs (PIDs), and their working-set memory usage in megabytes.



\## Features



\- Enumerates running processes using the Windows Tool Help API.

\- Displays process IDs and executable names.

\- Retrieves process memory usage through the Windows Process Status API.

\- Formats memory usage in MB for easy reading.

\- Handles process-access restrictions gracefully.



\## Technologies Used



\- C++

\- Windows API

\- Tool Help Library

\- Windows Process Status API (PSAPI)

\- MinGW GCC



\## Build



Compile the project from its root directory:



```bash

g++ -std=c++17 -Wall -Wextra src/main.cpp -o sysscope.exe -lpsapi

```



\## Run



```powershell

.\\sysscope.exe

```



\## How It Works



SysScope takes a snapshot of running Windows processes and iterates through the process entries. It attempts to open each process to retrieve its working-set memory usage. If access is unavailable, the memory value may appear as `0.00 MB`.



\## Platform



Windows



\## Future Improvements



\- Sort processes by memory usage.

\- Add process-name filtering.

\- Export process information to a CSV file.

