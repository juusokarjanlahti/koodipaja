# Käsitteellinen virhe: range(1, 10) päättyy lukuun 9, ei 10.
n = int(input())
for i in range(1, 10):
    print(f"{n} x {i} = {n * i}")
