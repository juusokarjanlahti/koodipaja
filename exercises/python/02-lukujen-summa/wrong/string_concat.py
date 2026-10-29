# Yleinen virhe: syötettä ei muuteta luvuksi, joten merkkijonot liitetään yhteen.
total = ""
while True:
    number = input()
    if number == "0":
        break
    total += number
print(f"Summa: {total}")
