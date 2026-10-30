# Käsitteellinen virhe: jakojäännös 0 tarkoittaa parillista, mutta ehto toimii päinvastoin.
n = int(input())
if n % 2:
    print("parillinen")
else:
    print("pariton")
