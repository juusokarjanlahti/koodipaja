# Koodipaja

Avoin ja maksuton ohjelmointitehtäväalusta ammattikorkeakouluille. Opiskelija kirjoittaa
koodia selaimessa ja saa automaattisen palautteen testitapauksista. Opettaja kokoaa
kurssin avoimesta tehtäväkirjastosta.

> Tila: varhainen vaihe. Tässä repossa on nyt tehtäväformaatti, validointiputki ja
> agenttien työohjeet. Sovellus (`app/`) rakennetaan seuraavaksi.

## Periaatteet

- **Sisältö koodina.** Jokainen tehtävä on kansio Gitissä: tehtävänanto, pohjakoodi,
  testit, mallivastaus ja tahallaan väärät vastaukset.
- **Koneellinen laadunvarmistus.** CI varmistaa, että mallivastaus läpäisee kaikki testit
  ja että jokainen väärä vastaus jää kiinni.
- **Avoin.** Koodi MIT-lisenssillä, tehtäväsisältö CC BY 4.0 -lisenssillä.
- **EU:ssa ja yksityisyyttä kunnioittaen.** Ei kolmannen osapuolen analytiikkaa.

## Tehtävän rakenne

```
exercises/python/01-tervehdys/
├── exercise.yaml     # metatiedot ja testitapaukset (syöte -> odotettu tuloste)
├── README.md         # tehtävänanto opiskelijalle
├── starter.py        # pohjakoodi
├── solution.py       # mallivastaus
└── wrong/            # realistisia virheellisiä vastauksia
```

Testitapaukset ovat syöte/tuloste-pareja, joten ne voidaan lähettää suoraan
Judge0-sandboxiin ilman muunnoksia.

## Käyttö

```bash
pip install pyyaml
python3 scripts/validate.py
```

## Tuotemäärittely

Visio, käyttäjät, roadmap ja riskit: [docs/product/](docs/product/README.md).

## Arkkitehtuuri

Suunniteltu pino: Next.js + TypeScript, PostgreSQL, Redis-jono, itse ylläpidetty Judge0
ja LTI 1.3 -integraatio Moodleen. Katso [docs/architecture.md](docs/architecture.md).

## Tekoälyagentit

Projekti rakennetaan Claude Coden ja muiden agenttien avulla. Agenttien työohjeet ovat
tiedostossa [CLAUDE.md](CLAUDE.md).

## Lisenssi

- Lähdekoodi: [MIT](LICENSE)
- Tehtäväsisältö (`exercises/`): [CC BY 4.0](exercises/LICENSE)
