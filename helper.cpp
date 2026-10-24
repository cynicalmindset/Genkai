
#include "load.hpp"

#include <algorithm>
#include <chrono>
#include <curl/curl.h>
#include <iostream>
#include <mutex>
#include <string>
#include <thread>
#include <vector>

using namespace std;

struct RequestResult {
    double latency;
    long status;
    bool failed;
};

size_t discardResponse(
    void* data, size_t size, size_t count, void* userdata
) {
    return size * count;
}

void runLoadTest(const string& url) {
    vector<int> concurrencyLevels = {1, 2, 4, 8, 16, 32, 64};

    const int durationSeconds = 5;
    const double maxErrorRate = 1.0;
    const double maxP95LatencyMs = 1000.0;

    cout << "Testing: " << url << '\n';
    cout << "Duration per stage: "
         << durationSeconds << " seconds\n";

    if (curl_global_init(CURL_GLOBAL_DEFAULT) != CURLE_OK) {
        cerr << "Failed to initialize libcurl\n";
        return;
    }

    int highestPassingConcurrency = 0;

    for (int concurrency : concurrencyLevels) {
        cout << "\nTesting with " << concurrency
             << " workers\n";

        vector<thread> workers;
        vector<RequestResult> results;
        mutex resultsMutex;

        auto testStart = chrono::steady_clock::now();
        auto deadline =
            testStart + chrono::seconds(durationSeconds);

        for (int i = 0; i < concurrency; i++) {
            workers.emplace_back([&]() {
                while (chrono::steady_clock::now() < deadline) {
                    CURL* curl = curl_easy_init();

                    if (!curl) {
                        cerr << "Failed to create CURL handle\n";
                        break;
                    }

                    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
                    curl_easy_setopt(
                        curl, CURLOPT_WRITEFUNCTION, discardResponse
                    );
                    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 2L);
                    curl_easy_setopt(curl, CURLOPT_NOSIGNAL, 1L);

                    auto start = chrono::steady_clock::now();
                    CURLcode result = curl_easy_perform(curl);
                    auto end = chrono::steady_clock::now();

                    double latency =
                        chrono::duration<double, milli>(
                            end - start
                        ).count();

                    long status = 0;
                    curl_easy_getinfo(
                        curl, CURLINFO_RESPONSE_CODE, &status
                    );

                    bool failed =
                        result != CURLE_OK ||
                        status < 200 ||
                        status >= 400;

                    RequestResult request{
                        latency,
                        status,
                        failed
                    };

                    {
                        lock_guard<mutex> lock(resultsMutex);
                        results.push_back(request);
                    }

                    curl_easy_cleanup(curl);
                }
            });
        }

        for (auto& worker : workers) {
            worker.join();
        }

        auto testEnd = chrono::steady_clock::now();

        double actualDuration =
            chrono::duration<double>(
                testEnd - testStart
            ).count();

        vector<double> latencies;
        int failedRequests = 0;

        for (const auto& request : results) {
            latencies.push_back(request.latency);

            if (request.failed) {
                failedRequests++;
            }
        }

        int totalRequests = static_cast<int>(results.size());
        int successfulRequests = totalRequests - failedRequests;

        double successfulRps = actualDuration > 0
            ? successfulRequests / actualDuration
            : 0.0;

        double errorRate = totalRequests > 0
            ? 100.0 * failedRequests / totalRequests
            : 0.0;

        double p95Latency = 0.0;

        if (!latencies.empty()) {
            sort(latencies.begin(), latencies.end());

            size_t index = static_cast<size_t>(
                0.95 * (latencies.size() - 1)
            );

            p95Latency = latencies[index];
        }

        bool stageFailed =
            errorRate > maxErrorRate ||
            latencies.empty() ||
            p95Latency > maxP95LatencyMs;

        cout << "Actual duration: "
             << actualDuration << " seconds\n";
        cout << "Total requests: " << totalRequests << '\n';
        cout << "Successful requests: "
             << successfulRequests << '\n';
        cout << "Failed requests: " << failedRequests << '\n';
        cout << "Successful throughput: "
             << successfulRps << " req/s\n";
        cout << "Error rate: " << errorRate << "%\n";
        cout << "P95 latency: " << p95Latency << " ms\n";

        if (stageFailed) {
            cout << "Stage result: FAILED\n";
            cout << "Stopping the load test.\n";
            break;
        }

        highestPassingConcurrency = concurrency;
        cout << "Stage result: PASSED\n";
    }

    cout << "\nHighest passing concurrency: "
         << highestPassingConcurrency << " workers\n";

    curl_global_cleanup();
}
