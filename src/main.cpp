#include <windows.h>
#include <tlhelp32.h>
#include <psapi.h>
#include <iostream>
#include <iomanip>
#include <string>
#include <vector>

struct ProcessInfo {
    DWORD pid;
    std::string name;
    double memoryMB;
};

std::string escapeJson(const std::string& str) {
    std::string out;
    for (char c : str) {
        if (c == '"') out += "\\\"";
        else if (c == '\\') out += "\\\\";
        else if (c == '\b') out += "\\b";
        else if (c == '\f') out += "\\f";
        else if (c == '\n') out += "\\n";
        else if (c == '\r') out += "\\r";
        else if (c == '\t') out += "\\t";
        else if (static_cast<unsigned char>(c) >= 32) out += c;
    }
    return out;
}

std::vector<ProcessInfo> getProcesses() {
    std::vector<ProcessInfo> list;
    HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);

    if (snapshot == INVALID_HANDLE_VALUE) {
        return list;
    }

    PROCESSENTRY32 process{};
    process.dwSize = sizeof(process);

    if (Process32First(snapshot, &process)) {
        do {
            SIZE_T memoryBytes = 0;
            HANDLE processHandle = OpenProcess(
                PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
                FALSE,
                process.th32ProcessID
            );

            if (processHandle != nullptr) {
                PROCESS_MEMORY_COUNTERS memoryInfo{};
                memoryInfo.cb = sizeof(memoryInfo);

                if (GetProcessMemoryInfo(
                        processHandle,
                        &memoryInfo,
                        sizeof(memoryInfo))) {
                    memoryBytes = memoryInfo.WorkingSetSize;
                }

                CloseHandle(processHandle);
            }

            double memoryMB = static_cast<double>(memoryBytes) / (1024.0 * 1024.0);

            list.push_back({
                process.th32ProcessID,
                std::string(process.szExeFile),
                memoryMB
            });

        } while (Process32Next(snapshot, &process));
    }

    CloseHandle(snapshot);
    return list;
}

int main(int argc, char* argv[]) {
    // Check for kill command: --kill <PID>
    if (argc >= 3 && std::string(argv[1]) == "--kill") {
        DWORD pid = static_cast<DWORD>(std::stoul(argv[2]));
        HANDLE hProc = OpenProcess(PROCESS_TERMINATE, FALSE, pid);
        if (!hProc) {
            std::cerr << "{\"error\": \"Could not open process with PID " << pid << "\"}\n";
            return 1;
        }
        if (!TerminateProcess(hProc, 1)) {
            CloseHandle(hProc);
            std::cerr << "{\"error\": \"Failed to terminate process with PID " << pid << "\"}\n";
            return 1;
        }
        CloseHandle(hProc);
        std::cout << "{\"success\": true, \"message\": \"Terminated process " << pid << "\"}\n";
        return 0;
    }

    bool jsonMode = (argc >= 2 && (std::string(argv[1]) == "--json" || std::string(argv[1]) == "-j"));

    std::vector<ProcessInfo> processes = getProcesses();

    if (jsonMode) {
        MEMORYSTATUSEX memStatus{};
        memStatus.dwLength = sizeof(memStatus);
        double totalPhysMB = 0;
        double availPhysMB = 0;
        DWORD memoryLoad = 0;

        if (GlobalMemoryStatusEx(&memStatus)) {
            totalPhysMB = static_cast<double>(memStatus.ullTotalPhys) / (1024.0 * 1024.0);
            availPhysMB = static_cast<double>(memStatus.ullAvailPhys) / (1024.0 * 1024.0);
            memoryLoad = memStatus.dwMemoryLoad;
        }

        std::cout << "{\n";
        std::cout << "  \"system\": {\n";
        std::cout << "    \"totalMemoryMB\": " << std::fixed << std::setprecision(2) << totalPhysMB << ",\n";
        std::cout << "    \"availMemoryMB\": " << std::fixed << std::setprecision(2) << availPhysMB << ",\n";
        std::cout << "    \"usedMemoryMB\": " << std::fixed << std::setprecision(2) << (totalPhysMB - availPhysMB) << ",\n";
        std::cout << "    \"memoryLoad\": " << memoryLoad << "\n";
        std::cout << "  },\n";
        std::cout << "  \"processes\": [\n";

        for (size_t i = 0; i < processes.size(); ++i) {
            std::cout << "    {\n";
            std::cout << "      \"pid\": " << processes[i].pid << ",\n";
            std::cout << "      \"name\": \"" << escapeJson(processes[i].name) << "\",\n";
            std::cout << "      \"memoryMB\": " << std::fixed << std::setprecision(2) << processes[i].memoryMB << "\n";
            std::cout << "    }" << (i + 1 < processes.size() ? "," : "") << "\n";
        }

        std::cout << "  ]\n";
        std::cout << "}\n";
        return 0;
    }

    // Default: Terminal table output
    std::cout << "\n================ SysScope ================\n";
    std::cout << std::left
              << std::setw(10) << "PID"
              << std::setw(30) << "Process Name"
              << "Memory (MB)\n";
    std::cout << "-------------------------------------------\n";

    for (const auto& proc : processes) {
        std::cout << std::left
                  << std::setw(10) << proc.pid
                  << std::setw(30) << proc.name
                  << std::fixed << std::setprecision(2)
                  << proc.memoryMB << '\n';
    }

    return 0;
}
