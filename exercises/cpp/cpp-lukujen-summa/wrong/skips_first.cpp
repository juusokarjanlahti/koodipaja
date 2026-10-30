// Käsitteellinen virhe: ensimmäinen luku luetaan ennen silmukkaa mutta sitä ei lasketa mukaan.
#include <iostream>

int main() {
    long long total = 0, n;
    std::cin >> n;
    while (n != 0) {
        std::cin >> n;
        total += n;
    }
    std::cout << "Summa: " << total << "\n";
    return 0;
}
