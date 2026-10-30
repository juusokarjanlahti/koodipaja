# Käsitteellinen virhe: range(n) alkaa nollasta, joten ensimmäinen rivi on tyhjä ja viimeinen puuttuu.
n = int(input())
for i in range(n):
    print("*" * i)
