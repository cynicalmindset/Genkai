#pragma once
#include <bits/stdc++.h>
using namespace std;

struct BenchmarkResult {
    double time_ms;
    double peak_ram_kb;
};

BenchmarkResult benchmark(const vector<string>& command);