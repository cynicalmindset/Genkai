// load testing , here i am sending a lot of requests to the API and monitoring the error rates

// some terms for understanding here
// concurrency = how many workers are sending requests
// throughput = how many requests are being successfull 

// we are here increasing concurrnecy until it breaks 


#include "load.hpp"

#include<bits/stdc++.h>
#include<chrono>
#include <curl/curl.h>

using namespace std;

// its basically the node of per requests containng latency, satus ,failed report
struct reqres {
    double latency;
    long status;
    bool failed;
};

//response will contain a lot of info but we only need size and count so discarding wverything else here
size_t discardres (void* data, size_t size, size_t count, void* userdata){
    return size*count;
};


void Load(const string& url){
    //concurrency level { will make it inscresae by sqr until error rate is  over thershold}
    // vector<int> level;
    const int maxConcurrency = 224;

    const int durationSeconds = 5;
    const double maxErrorRate = 1.0;
    const double maxP95LatencyMs = 1000.0; // P95 helps you understand the experience of slower requests without letting one extremely slow request dominate the measurement.

    cout << "testing: "<<url<<'\n';
    cout << "duration of per stage: "<<durationSeconds<<' sec\n';

    //checking curl is working or not
    if(curl_global_init(CURL_GLOBAL_DEFAULT)!=CURLE_OK){
        cerr << "failed to init curl";
        return;
    }

    int highestPassingConcurrency = 0; // recording the highest number of worker that scored passed
    double bestThroughput = 0.0;
    double bestP95 = 0.0;
    double bestErrorRate = 0.0;

    for(int conc = 2; conc <= maxConcurrency; conc += 2){ // itrating conc levels
        cout << "\ntesiting with " << conc <<" workers\n";

        vector<thread> workers;
        vector<reqres> results;
        mutex resMutex; // its like a key allowing the result vector to be modified individually 

        auto testS = chrono::steady_clock::now();
        auto deadline = testS + chrono::seconds(durationSeconds); // each level will have a deadline

        for(int i = 0;i<conc;i++){
            workers.emplace_back([&]() {
                while(chrono::steady_clock::now() < deadline){

                    CURL* curl = curl_easy_init();

                    if(!curl){
                        cerr << "failed to create curl reques\n";
                        break;
                    }

                    //sseding http requests to API
                    curl_easy_setopt(curl, CURLOPT_URL, url.c_str()); // telling the erquests where to go
                    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, discardres); // telling curl now what the response should look like
                    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 2L); // stoping the requests if it take more than 2 sec
                    curl_easy_setopt(curl, CURLOPT_NOSIGNAL, 1L); // preventing signal related problems here

                    auto s = chrono::steady_clock::now();
                    CURLcode res = curl_easy_perform(curl);
                    auto e= chrono::steady_clock::now();

                    //getting latency of per request here
                    double latency = chrono::duration<double,milli>(e-s).count();

                    //getting status of per req
                    long status = 0;
                    curl_easy_getinfo(curl,CURLINFO_RESPONSE_CODE,&status);
                    bool failed = res != CURLE_OK || status < 200 || status >= 400;

                    //stroing the res in node
                    reqres request{
                        latency,
                        status,
                        failed
                    };

                    {
                        lock_guard<mutex> lock(resMutex);
                        results.push_back(request);  
                    }

                    curl_easy_cleanup(curl);

                }
            });
        }


        for(auto& worker: workers){
            worker.join();
        }


        auto testend = chrono::steady_clock::now();
        double actualduration = chrono::duration<double>(testend-testS).count();

        vector<double> latencies;
        int failedreq = 0;

        //pushing latency to array for P95 calc and also counting total failed req here
        for(const auto& request: results){
            latencies.push_back(request.latency);
            if(request.failed){
                failedreq++;
            }
        }

        int totalRequests = static_cast<int>(results.size());
        int successfulRequests = totalRequests - failedreq;

        double successfulRps = actualduration > 0
            ? successfulRequests / actualduration
            : 0.0;
        double errorRate = totalRequests > 0 ? 100.0 * failedreq/totalRequests : 0.0;

        double P95 = 0.0;

        if(!latencies.empty()){
            sort(latencies.begin(), latencies.end());
            size_t index = static_cast<size_t>(0.95 * (latencies.size()-1));
            P95 = latencies[index];
        }

        bool stageFailed = errorRate > maxErrorRate || latencies.empty() || P95 > maxP95LatencyMs;

        cout << "Actual duration: "<< actualduration << " seconds\n";
        cout << "Total requests: " << totalRequests << '\n';
        cout << "Successful requests: " << successfulRequests << '\n';
        cout << "Failed requests: " << failedreq << '\n';
        cout << "Successful throughput: "<< successfulRps << " req/s\n";
        cout << "Error rate: " << errorRate << "%\n";
        cout << "P95 latency: " << P95 << " ms\n";

        if (stageFailed) {
            cout << "Stage result: FAILED\n";
            cout << "Stopping the load test.\n";
            break;
        }

        highestPassingConcurrency = conc;
        bestThroughput = successfulRps;
        bestP95 = P95;
        bestErrorRate = errorRate;
        cout << "Stage result: PASSED\n";

    }



    const double secondsPerUserRequest = 5.0;

    double estimatedUsers = bestThroughput * secondsPerUserRequest;

    cout << "\n--- CAPACITY REPORT ---\n";
    cout << "Highest passing concurrency: "<< highestPassingConcurrency << " workers\n";
    cout << "Sustainable throughput: "<< bestThroughput << " requests/sec\n";
    cout << "P95 latency: " << bestP95 << " ms\n";
    cout << "Error rate: " << bestErrorRate << "%\n";
    cout << "Estimated active users: "<< static_cast<int>(estimatedUsers) << '\n';
    cout << "Assumption: 1 request every "<< secondsPerUserRequest << " seconds per user\n\n";

    cout << "\bThis is a rough estimate, not a guaranteed user limit. It assumes evenly spaced requests and doesn't model login bursts, database bottlenecks, or users making multiple API calls.\n";

    curl_global_cleanup();

}


