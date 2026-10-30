# Käsitteellinen virhe: tyhjä rivi lisätään listaan ennen tarkistusta.
ostokset = []
while True:
    rivi = input()
    ostokset.append(rivi)
    if rivi == "":
        break
print(f"Ostoksia: {len(ostokset)}")
for i in range(len(ostokset)):
    print(f"{i + 1}. {ostokset[i]}")
