// Hyväksytään: kirjainkoko ja kaksoispiste poikkeavat, summa on oikein.
#include <iostream>

int main() {
    long long total = 0, n;
    while (std::cin >> n && n != 0) total += n;
    std::cout << "summa " << total << std::endl;
    return 0;
}
