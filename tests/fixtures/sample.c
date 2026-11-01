#include <stdio.h>
#define MAX(a, b) ((a) > (b) ? (a) : \
                   (b))

/* Sum of an array. */
static long sum(const int *xs, size_t n) {
    long s = 0;
    for (size_t i = 0; i < n; i++) s += xs[i];
    return s;
}

int main(void) {
    int xs[] = {1, 2, 0x10, 'A'};
    printf("%ld\n", sum(xs, sizeof xs / sizeof *xs));
    return MAX(0, 1) == 1 ? 0 : 1;
}
