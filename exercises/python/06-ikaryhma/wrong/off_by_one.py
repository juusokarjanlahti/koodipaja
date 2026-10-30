# Käsitteellinen virhe: raja 18 menee väärään ryhmään (> eikä >=).
ika = int(input())
if ika > 18 and ika < 65:
    print("aikuinen")
elif ika >= 65:
    print("eläkeikäinen")
else:
    print("alaikäinen")
