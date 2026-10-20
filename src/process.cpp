#include <bits/stdc++.h>
#include "process.hpp"
#include <sys/wait.h>
#include <sys/resource.h>

using namespace std;

BenchmarkResult benchmark(const vector<string>& command){
    auto start = chrono::steady_clock::now();

    pid_t pid = fork();
    if(pid==0){
        vector<char*> args;
        for(const auto& arg : command){
            args.push_back(const_cast<char*>(arg.c_str()));
        }

        args.push_back(nullptr);

        execvp(args[0],args.data());

        perror("execvp failed");
        _exit(127);
    }

    if (pid < 0) {
    perror("fork failed");
    return {-1,-1};
    }

    int status;
    struct rusage usage{};

    if (wait4(pid, &status, 0, &usage) < 0) {
        perror("wait4 failed");
        return {-1, -1};
    }

    auto end = chrono::steady_clock::now();

    double elapsed = chrono::duration<double, milli>(
        end - start
    ).count();

    double peak_ram = usage.ru_maxrss;

    return {elapsed, peak_ram};
}