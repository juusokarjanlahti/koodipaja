# Käsitteellinen virhe: lopettava nolla lasketaan mukaan lukujen määrään.
summa = 0
maara = 0
while True:
    luku = int(input())
    maara += 1
    if luku == 0:
        break
    summa += luku
if summa == 0:
    print("Ei lukuja")
else:
    print(f"Keskiarvo: {summa / maara:.2f}")
