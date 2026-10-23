#include <bits/stdc++.h>
#include "statistics.hpp"
#include <fstream>
#include <iomanip>
#include "process.hpp"
#include "compare.hpp"
#include "load.hpp"
using namespace std;

void showResult(const string& filename) {

    ifstream file(filename);

    if (!file) {
        cerr << "Could not open: " << filename << "\n";
        return;
    }

    string line;

    cout << "\nGenkai Benchmark Results\n";
    cout << "------------------------\n";

    while (getline(file, line)) {
        size_t colon = line.find(':');

        if (colon == string::npos) continue;

        string key = line.substr(0, colon);
        string value = line.substr(colon + 1);

        key.erase(remove(key.begin(), key.end(), '"'), key.end());
        value.erase(remove(value.begin(), value.end(), ','), value.end());
        value.erase(remove(value.begin(), value.end(), '"'), value.end());

        if (key.find("runs") != string::npos)
            cout << "Runs: " << value << '\n';
        // else if (key.find("average") != string::npos)
        //     cout << "Average: " << value << " ms\n";
        else if (key.find("median") != string::npos)
            cout << "Median: " << value << " ms\n";
        else if (key.find("min") != string::npos)
            cout << "Minimum: " << value << " ms\n";
        else if (key.find("max") != string::npos)
            cout << "Maximum: " << value << " ms\n";
        else if (key.find("average_ram_mb") != string::npos)
            cout << "Average RAM: " << value << " MB\n";
        else if (key.find("peak_ram_mb") != string::npos)
            cout << "Peak RAM: " << value << " MB\n";
        else if (key.find("average") != string::npos)
            cout << "Average: " << value << " ms\n";
        }
}

void showHelp() {
    cout << "Genkai - Performance Engineering CLI\n\n";
    cout << "Usage:\n";
    cout << "1. genkai bench [options] -- <command> [args...]\n";
    cout << "2. genkai compare <old.json> <new.json>\n";
    cout << "3. genkai help\n";
    cout << "4. genkai history\n";
    cout << "5. genkai show <file.json>\n";
}

void history(){
    namespace fs = filesystem;
    bool found = false;
    for(const auto& entry : fs::directory_iterator(".")){
        if(entry.is_regular_file() && entry.path().filename().string().rfind("benchmark_", 0) == 0 && entry.path().extension() == ".json"){
            cout << entry.path().filename().string() << '\n';
            found = true;
        }
    }

    if(!found){
        cout << "no bencmarks results";
    }
}

int main(int argc, char* argv[]){

    if(argc < 2 || string(argv[1]) == "help" || string(argv[1]) == "--help"){
        showHelp();
        return 0;
    }

    string action = argv[1];
    vector<string> command;
    vector<double> times;

    if (action == "show") {
    if (argc != 3) {
            cerr << "Usage: genkai show <file.json>\n";
            return 1;
        }

        showResult(argv[2]);
        return 0;
    }

    if(action == "history"){
        history();
        return 0;
    }

    if (action == "load") {
        if (argc != 3){
            cerr << "usage genkai load url\n";
            return 1;
        }

        try {
            // int requests = stoi(argv[4]);
            // int concurrency = stoi(argv[6]);

            runLoadTest(argv[2]);
        } catch (...) {
            cerr << "Invalid request or concurrency count.\n";
            return 1;
        }

        return 0;
    }

    if (action == "compare") {
        if (argc < 4) {
            cerr << "Usage: genkai compare <old.json> <new.json> [--threshold N]\n";
            return 1;
        }

        double threshold = 10.0;

        if (argc == 6 && string(argv[4]) == "--threshold") {
            try {
                threshold = stod(argv[5]);

                if (threshold < 0) {
                    cerr << "Threshold cannot be negative\n";
                    return 1;
                }
            } catch (...) {
                cerr << "Invalid threshold value\n";
                return 1;
            }
        } else if (argc != 4) {
            cerr << "Usage: genkai compare <old.json> <new.json> [--threshold N]\n";
            return 1;
        }

        compareres(argv[2], argv[3], threshold);
        return 0;
    }

    if(action == "bench"){
        int commandStart = 2;
        int runs = 5;

        if (argc >= 4 && string(argv[2]) == "--runs") {
            runs = stoi(argv[3]);
            commandStart = 4;
        }

        if (commandStart < argc &&
            string(argv[commandStart]) == "--") {
            commandStart++;
        }

        for (int i = commandStart; i < argc; i++) {
            command.push_back(argv[i]);
        }

        if (commandStart >= argc || runs < 1) {
            cerr << "Usage: genkai bench [--runs N] -- <command> [args...]\n";
            return 1;
        }

        vector<double> times;
        vector<double> memoryUsage;
        
        for (int i = 0; i < runs; i++) {
            BenchmarkResult result = benchmark(command);

            if (result.time_ms < 0) {
                cerr << "Benchmarking failed\n";
                return 1;
            }

            times.push_back(result.time_ms);
            memoryUsage.push_back(result.peak_ram_kb);

            // cout << "Run " << i + 1
            //     << ": " << result.time_ms << " ms"
            //     << " | Peak RAM: " << result.peak_ram_kb / 1024.0
            //     << " MB\n";
        }

        double average = calculateagv(times);
        double med = median(times);
        double minTime = minimum(times);
        double maxTime = maximum(times);
        double avgMemory = calculateagv(memoryUsage);


        //file saving
        auto now = chrono::system_clock::to_time_t(
            chrono::system_clock::now()
        );

        tm* timeInfo = localtime(&now);

        ostringstream timestamp;
        timestamp << put_time(timeInfo, "%Y%m%d_%H%M%S");

        string filename = "benchmark_" + timestamp.str() + ".json";

        ofstream file(filename);

        if (!file) {
            std::cerr << "Failed to create" <<filename<<"\n";
            return 1;
        }

        file << std::fixed << std::setprecision(2);

        file << "{\n";
        file << "  \"runs\": " << times.size() << ",\n";
        file << "  \"average\": " << average << ",\n";
        file << "  \"median\": " << med << ",\n";
        file << "  \"min\": " << minTime << ",\n";
        file << "  \"max\": " << maxTime << ",\n";
        file << "  \"average_ram_mb\": " << avgMemory / 1024.0 << ",\n";
        file << "  \"peak_ram_mb\": " << *max_element(memoryUsage.begin(), memoryUsage.end()) / 1024.0 << ",\n";
        file << "  \"times_ms\": [";

        for (std::size_t i = 0; i < times.size(); i++) {
            if (i > 0) {
                file << ", ";
            }
            file << times[i];
        }

        file << "]\n";
        file << "}\n";

        file.close();

        cout << "\nResults saved to: "<<filename<<" \n";
        return 0;

    }

    cerr << "Unknown command: " << action << "\n";
    cerr << "Run 'genkai help' for usage.\n";
    return 1;
}