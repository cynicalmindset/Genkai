#include <bits/stdc++.h>
#include "compare.hpp"
#include <fstream>  
using namespace std;

double getavg(const char* filename){
    ifstream file(filename);
    if(!file){
        cerr << "file cannot be found: "<< filename<<'\n';
        return 1;
    }

    string line;

    while(getline(file,line)){
        if(line.find("\"average\"")!=string::npos){
            auto colon = line.find(':');
            if(colon != string::npos){
                return stod(line.substr(colon+1));
            }
        }
    }

    cerr << "not able to find average in the json of: "<< filename<<'\n';
    return -1;
}

double averageram(const char* filename){
    ifstream file(filename);
    if(!file){
        cerr << "file cannot be found: "<<filename<<'\n';
        return 1;
    }

    string line;
    
    while(getline(file,line)){
        if(line.find("\"average_ram_mb\"")!=string::npos){
            auto colon = line.find(':');
            if(colon != string::npos){
                return stod(line.substr(colon+1));
            }
        }
    }

    cerr << "not able to find average in the json of: "<< filename<<'\n';
    return -1;

}

double peakram(const char* filename){
    ifstream file(filename);
    if(!file){
        cerr << "file cannot be found: "<<filename<<'\n';
        return 1;
    }

    string line;
    
    while(getline(file,line)){
        if(line.find("\"peak_ram_mb\"")!=string::npos){
            auto colon = line.find(':');
            if(colon != string::npos){
                return stod(line.substr(colon+1));
            }
        }
    }

    cerr << "not able to find average in the json of: "<< filename<<'\n';
    return -1;

}

void compareres(const char* file1, const char* file2, double threshold) {

    const double thres = threshold;

    double old = getavg(file1);
    double newf = getavg(file2);

    double oldAR = averageram(file1);
    double newAR = averageram(file2);

    double oldPR = peakram(file1);
    double newPR = peakram(file2);


    if (old <= 0 || newf < 0) {
        cerr << "Invalid runtime values\n";
        return;
    }

    if (oldAR <= 0 || newAR < 0 || oldPR <= 0 || newPR < 0) {
        cerr << "Invalid RAM values\n";
        return;
    }


    double runtimeChange = ((newf - old) / old) * 100.0;
    double avgRamChange = ((newAR - oldAR) / oldAR) * 100.0;
    double peakRamChange = ((newPR - oldPR) / oldPR) * 100.0;

    cout << fixed << setprecision(2);

    cout << "\n--- Genkai Comparison ---\n";

    cout << "\nRuntime:\n";
    cout << "Before: " << old << " ms\n";
    cout << "After:  " << newf << " ms\n";
    cout << "Change: " << runtimeChange << "%\n";

    cout << "\nAverage RAM:\n";
    cout << "Before: " << oldAR << " MB\n";
    cout << "After:  " << newAR << " MB\n";
    cout << "Change: " << avgRamChange << "%\n";

    cout << "\nPeak RAM:\n";
    cout << "Before: " << oldPR << " MB\n";
    cout << "After:  " << newPR << " MB\n";
    cout << "Change: " << peakRamChange << "%\n";

    if (runtimeChange < 0)
        cout << "Performance improved\n";
    else if (runtimeChange > 0)
        cout << "Performance decreased\n";
    else
        cout << "No runtime change\n";

    cout << "\n--- Regression Detection ---\n";

    if (runtimeChange >= thres)
    cout << "[WARNING] Runtime regression detected!\n\n";

    if (avgRamChange >= thres)
        cout << "[WARNING] Average RAM usage increased significantly!\n\n";

    if (peakRamChange >= thres)
        cout << "[WARNING] Peak RAM usage increased significantly!\n\n";

    if (runtimeChange < thres &&
        avgRamChange < thres &&
        peakRamChange < thres) {
        cout << "No significant regression detected.\n\n";
    }

    cout << "comparision end here\n";
}