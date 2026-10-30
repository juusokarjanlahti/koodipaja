#include <iostream>

int main() {
    long long total = 0, n;
    while (std::cin >> n && n != 0) {
        total += n;
    }
    std::cout << "Summa: " << total << "\n";
    return 0;
}
