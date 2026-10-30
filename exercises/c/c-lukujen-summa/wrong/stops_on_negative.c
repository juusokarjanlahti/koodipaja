// Käsitteellinen virhe: silmukka lopetetaan kaikilla ei-positiivisilla luvuilla.
#include <stdio.h>

int main(void) {
    long long total = 0, n;
    while (scanf("%lld", &n) == 1 && n > 0) {
        total += n;
    }
    printf("Summa: %lld\n", total);
    return 0;
}
