# Lukujen summa (Rust)

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

Vihje: Lue koko syöte `io::stdin().read_to_string(&mut syote)`-kutsulla ja käy rivit läpi `syote.lines()`-metodilla. Muuta rivi luvuksi `rivi.trim().parse::<i64>()`.
