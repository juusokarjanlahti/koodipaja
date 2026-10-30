maara = int(input())
luvut = []
for _ in range(maara):
    luvut.append(int(input()))
suurin = luvut[0]
for luku in luvut:
    if luku > suurin:
        suurin = luku
print(f"Suurin: {suurin}")
