# Käsitteellinen virhe: numerointi alkaa nollasta (indeksi), vaikka tehtävä pyytää ykkösestä.
ostokset = []
while True:
    rivi = input()
    if rivi == "":
        break
    ostokset.append(rivi)
print(f"Ostoksia: {len(ostokset)}")
for i in range(len(ostokset)):
    print(f"{i}. {ostokset[i]}")
