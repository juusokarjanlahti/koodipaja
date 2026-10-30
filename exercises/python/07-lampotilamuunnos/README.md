# Lämpötilamuunnos

Kirjoita ohjelma, joka lukee lämpötilan celsiusasteina (voi olla desimaaliluku) ja
tulostaa sen fahrenheitasteina yhden desimaalin tarkkuudella muodossa `<luku> °F`.

Kaava: F = C · 9 / 5 + 32

## Esimerkkiajo

Syöte:

```
36.6
```

Tuloste:

```
97.9 °F
```

Vihje: `float()` muuttaa tekstin desimaaliluvuksi, ja f-merkkijonossa `{luku:.1f}` näyttää yhden desimaalin.
