// Hyväksytään: kirjainkoko ja kaksoispiste poikkeavat, summa on oikein.
#include <stdio.h>

int main(void) {
    long long total = 0, n;
    while (scanf("%lld", &n) == 1 && n != 0) total += n;
    printf("summa %lld\n", total);
    return 0;
}
