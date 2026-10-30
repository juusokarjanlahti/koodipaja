# Lukujen summa (C++)

Kirjoita ohjelma, joka lukee kokonaislukuja yksi kerrallaan, kunnes käyttäjä syöttää
luvun `0`. Lopuksi ohjelma tulostaa syötettyjen lukujen summan muodossa `Summa: <luku>`.

Ohjelma ei tulosta mitään kysymyksiä, vain lopputuloksen. Luvut voivat olla myös
negatiivisia.

## Esimerkkiajo

Syöte:

```
3
4
0
```

Tuloste:

```
Summa: 7
```

Vihje: Lue luku `std::cin >> luku` -lausekkeella. Käytä summalle tyyppiä `long long`.
