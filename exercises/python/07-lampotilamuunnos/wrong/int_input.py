# Käsitteellinen virhe: int() ei hyväksy desimaalilukua, joten 36.6 kaataa ohjelman.
c = int(input())
f = c * 9 / 5 + 32
print(f"{f:.1f} °F")
