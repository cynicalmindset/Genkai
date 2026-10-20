#include "statistics.hpp"
#include<bits/stdc++.h>
using namespace std;

double calculateagv(const vector<double>& times){
    if(times.empty()){
        return 0.0;
    }

    double total = 0;

    for(double time: times){
        total += time;
    }

    return total/times.size();
}


double median(const vector<double>& times){
    if(times.empty()){
        return 0.0;
    }

    double total = 0;
    vector<double> sorting = times;
    sort(sorting.begin(),sorting.end());

    size_t middle = times.size()/2;

    if(times.size()%2==0){
        return (times[middle - 1] + times[middle]) / 2.0;
    }

    return times[middle];
}

double minimum(const vector<double>& times){
    if(times.empty()){
        return 0.0;
    }
    return *min_element(times.begin(),times.end());
}

double maximum(const vector<double>& times){
    if(times.empty()){
        return 0.0;
    }
    return *max_element(times.begin(),times.end());
}