# Käsitteellinen virhe: ehdot väärässä järjestyksessä, joten 65-vuotias on "aikuinen".
ika = int(input())
if ika >= 18:
    print("aikuinen")
elif ika >= 65:
    print("eläkeikäinen")
else:
    print("alaikäinen")
