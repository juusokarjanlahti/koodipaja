# Käsitteellinen virhe: haku aloitetaan nollasta, joten negatiivisilla luvuilla tulos on 0.
maara = int(input())
suurin = 0
for _ in range(maara):
    luku = int(input())
    if luku > suurin:
        suurin = luku
print(f"Suurin: {suurin}")
