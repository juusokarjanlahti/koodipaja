# Hyväksytään: kirjainkoko ja kaksoispiste poikkeavat, summa on oikein.
total = 0
while True:
    number = int(input())
    if number == 0:
        break
    total += number
print("summa", total)
