#pragma once

#include <string>

void runLoadTest(
    const std::string& url,
    int requests,
    int concurrency
);