#include "load.hpp"
#include <bits/stdc++.h>
#include <curl/curl.h>
#include <algorithm>
#include <chrono>
#include <iomanip>
#include <iostream>
#include <mutex>
#include <thread>
#include <vector>

using namespace std;

struct RequestResult {
    double latency_ms;
    long status;
    bool failed;
};

static size_t discardResponse(
    void* data, size_t size, size_t count, void* userdata
) {
    return size * count;
}

void runLoadTest(const string& url, int requests, int concurrency) {
    if (requests <= 0 || concurrency <= 0) {
        cerr << "Requests and concurrency must be positive.\n";
        return;
    }

    concurrency = min(concurrency, requests);

    if (curl_global_init(CURL_GLOBAL_DEFAULT) != CURLE_OK) {
        cerr << "Failed to initialize libcurl.\n";
        return;
    }

    vector<RequestResult> results(requests);
    mutex outputMutex;
    int nextRequest = 0;

    auto testStart = chrono::steady_clock::now();

    auto worker = [&]() {
        while (true) {
            int index;

            {
                lock_guard<mutex> lock(outputMutex);
                if (nextRequest >= requests) return;
                index = nextRequest++;
            }

            CURL* curl = curl_easy_init();
            if (!curl) {
                results[index] = {0, 0, true};
                continue;
            }

            curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
            curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, discardResponse);
            curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
            curl_easy_setopt(curl, CURLOPT_NOSIGNAL, 1L);
            curl_easy_setopt(curl, CURLOPT_TIMEOUT, 30L);

            auto start = chrono::steady_clock::now();
            CURLcode code = curl_easy_perform(curl);
            auto end = chrono::steady_clock::now();

            long status = 0;
            curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &status);

            double latency = chrono::duration<double, milli>(
                end - start
            ).count();

            results[index] = {
                latency,
                status,
                code != CURLE_OK
            };

            curl_easy_cleanup(curl);
        }
    };

    vector<thread> workers;
    for (int i = 0; i < concurrency; i++) {
        workers.emplace_back(worker);
    }

    for (auto& workerThread : workers) {
        workerThread.join();
    }

    auto testEnd = chrono::steady_clock::now();
    curl_global_cleanup();

    vector<double> latencies;
    int failedRequests = 0;
    int httpErrors = 0;
    int successfullRequests = 0;

    for (const auto& result : results) {
        if (result.failed) {
            failedRequests++;
        } else {
            latencies.push_back(result.latency_ms);
            if (result.status >= 400){
                httpErrors++;
            }else{
                successfullRequests++;
            }
        }
    }

    if (latencies.empty()) {
        cerr << "All requests failed. Check the URL and network.\n";
        return;
    }

    sort(latencies.begin(), latencies.end());

    double totalSeconds = chrono::duration<double>(
        testEnd - testStart
    ).count();

    double average = 0;
    for (double latency : latencies) average += latency;
    average /= latencies.size();

    size_t p95Index = static_cast<size_t>(
        0.95 * (latencies.size() - 1)
    );

    // cout << fixed << setprecision(2);
    // cout << "\n--- Genkai HTTP Load Test ---\n";
    // cout << "URL: " << url << '\n';
    // cout << "Requests: " << requests << '\n';
    // cout << "Concurrency: " << concurrency << '\n';
    // cout << "Duration: " << totalSeconds << " s\n";
    // cout << "Throughput: " << successfullRequests / totalSeconds << " Requests/s\n";    
    // cout << "Average latency: " << average << " ms\n";
    // cout << "P95 latency: " << latencies[p95Index] << " ms\n";
    // cout << "Successful requests: " << successfullRequests << '\n';
    // cout << "HTTP errors (4xx/5xx): " << httpErrors << '\n';
    // cout << "Failed requests: " << failedRequests << '\n';


    //File saving
    auto now = chrono::system_clock::to_time_t(
        chrono::system_clock::now()
    );

    tm* timeInfo = localtime(&now);
    ostringstream timestamp;
    timestamp << put_time(timeInfo, "%Y%m%d_%H%M%S");

    string filename = "loadtest_" + timestamp.str() + ".json";

    ofstream file(filename);

    if (!file) {
        cerr << "Failed to create " << filename << '\n';
        return;
    }

    file << fixed << setprecision(2);
    file << "{\n";
    file << "  \"url\": \"" << url << "\",\n";
    file << "  \"requests\": " << requests << ",\n";
    file << "  \"concurrency\": " << concurrency << ",\n";
    file << "  \"duration_seconds\": " << totalSeconds << ",\n";
    file << "  \"throughput_rps\": "
         << successfullRequests / totalSeconds << ",\n";
    file << "  \"average_latency_ms\": " << average << ",\n";
    file << "  \"p95_latency_ms\": " << latencies[p95Index] << ",\n";
    file << "  \"successful_requests\": " << successfullRequests << ",\n";
    file << "  \"http_errors\": " << httpErrors << ",\n";
    file << "  \"failed_requests\": " << failedRequests << "\n";
    file << "}\n";

    file.close();

    cout << "\nResults saved to: " << filename << '\n';
}
