# Käsitteellinen virhe: tyhjää syötettä ei käsitellä, joten jaetaan nollalla.
summa = 0
maara = 0
while True:
    luku = int(input())
    if luku == 0:
        break
    summa += luku
    maara += 1
print(f"Keskiarvo: {summa / maara:.2f}")
