// Käsitteellinen virhe: etumerkitön tyyppi ei voi esittää negatiivisia summia.
#include <stdio.h>

int main(void) {
    unsigned int total = 0;
    int n;
    while (scanf("%d", &n) == 1 && n != 0) {
        total += n;
    }
    printf("Summa: %u\n", total);
    return 0;
}
