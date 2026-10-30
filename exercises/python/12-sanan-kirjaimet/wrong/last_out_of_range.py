# Käsitteellinen virhe: viimeinen indeksi on len(sana) - 1, ei len(sana).
sana = input()
print(f"Pituus: {len(sana)}")
print(f"Ensimmäinen kirjain: {sana[0]}")
print(f"Viimeinen kirjain: {sana[len(sana)]}")
