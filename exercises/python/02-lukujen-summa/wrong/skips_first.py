# Yleinen virhe: ensimmäinen luku luetaan ennen silmukkaa mutta sitä ei lasketa mukaan.
total = 0
number = int(input())
while number != 0:
    number = int(input())
    total += number
print(f"Summa: {total}")
