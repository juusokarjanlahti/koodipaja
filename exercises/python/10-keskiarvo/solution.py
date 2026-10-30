summa = 0
maara = 0
while True:
    luku = int(input())
    if luku == 0:
        break
    summa += luku
    maara += 1
if maara == 0:
    print("Ei lukuja")
else:
    print(f"Keskiarvo: {summa / maara:.2f}")
