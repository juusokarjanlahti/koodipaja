# Käsitteellinen virhe: luvut jätetään merkkijonoiksi, joten "9" > "10".
maara = int(input())
luvut = []
for _ in range(maara):
    luvut.append(input())
suurin = luvut[0]
for luku in luvut:
    if luku > suurin:
        suurin = luku
print(f"Suurin: {suurin}")
