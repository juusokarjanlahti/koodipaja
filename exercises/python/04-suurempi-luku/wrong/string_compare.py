# Käsitteellinen virhe: merkkijonoja verrataan aakkosjärjestyksessä, joten "9" > "10".
a = input()
b = input()
if a > b:
    print(f"Suurempi luku on {a}")
elif b > a:
    print(f"Suurempi luku on {b}")
else:
    print("Luvut ovat yhtä suuret")
