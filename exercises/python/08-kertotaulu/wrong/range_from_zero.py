# Käsitteellinen virhe: range(10) alkaa nollasta ja päättyy yhdeksään.
n = int(input())
for i in range(10):
    print(f"{n} x {i} = {n * i}")
