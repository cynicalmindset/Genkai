cmake_minimum_required(VERSION 3.16)
project(genkai LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(CURL REQUIRED)
find_package(Threads REQUIRED)

add_executable(genkai
    src/main.cpp
    src/statistics.cpp
    src/process.cpp
    src/compare.cpp
    src/load.cpp
)

target_include_directories(genkai PRIVATE include)

target_link_libraries(genkai PRIVATE
    CURL::libcurl
    Threads::Threads
)