# Yleinen virhe: silmukka lopetetaan kaikilla ei-positiivisilla luvuilla.
total = 0
while True:
    number = int(input())
    if number <= 0:
        break
    total += number
print(f"Summa: {total}")
