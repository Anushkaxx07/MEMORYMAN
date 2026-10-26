#include <windows.h>
#include <tlhelp32.h>
#include <psapi.h>
#include <iostream>
#include <iomanip>

int main() {
    HANDLE snapshot = CreateToolhelp32Snapshot(
        TH32CS_SNAPPROCESS, 0
    );

    if (snapshot == INVALID_HANDLE_VALUE) {
        std::cerr << "Error: Could not retrieve processes.\n";
        return 1;
    }

    PROCESSENTRY32 process{};
    process.dwSize = sizeof(process);

    std::cout << "\n================ SysScope ================\n";
    std::cout << std::left
              << std::setw(10) << "PID"
              << std::setw(30) << "Process Name"
              << "Memory (MB)\n";
    std::cout << "-------------------------------------------\n";

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

            double memoryMB =
                static_cast<double>(memoryBytes) / (1024.0 * 1024.0);

            std::cout << std::left
                      << std::setw(10) << process.th32ProcessID
                      << std::setw(30) << process.szExeFile
                      << std::fixed << std::setprecision(2)
                      << memoryMB << '\n';

        } while (Process32Next(snapshot, &process));
    }

    CloseHandle(snapshot);
    return 0;
}