# Koodipaja

Avoin ja maksuton ohjelmointitehtäväalusta ammattikorkeakouluille. Opiskelija kirjoittaa
koodia selaimessa ja saa automaattisen palautteen testitapauksista. Opettaja kokoaa
kurssin avoimesta tehtäväkirjastosta.

> Tila: varhainen vaihe. Opiskelijan tehtävänäkymä, palaute, Moodle-kirjautuminen (LTI 1.3),
> arvosanat Moodleen ja opettajan etenemisnäkymä toimivat; pilottia valmistellaan.

## Kokeile omalla koneella

Tarvitset Dockerin (Compose v2) ja Node.js 22:n. Windowsissa aja komennot WSL 2:ssa.

```bash
git clone https://github.com/juusokarjanlahti/koodipaja.git && cd koodipaja
./scripts/dev-setup.sh          # kerran: salaisuudet, Postgres, Redis, go-judge, tietokanta
cd app && npm run dev:all        # sovellus ja worker; Ctrl+C pysäyttää
```

Avaa <http://localhost:3000>, kirjaudu millä tahansa sähköpostiosoitteella (vain
kehityskäyttöön) ja avaa tehtävä. Ensimmäinen `dev-setup.sh` rakentaa sandbox-kuvan
kääntäjineen, mikä kestää muutaman minuutin. Lisää voi lukea täältä: [docs/local-dev.md](docs/local-dev.md).

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
sandboxiin ilman muunnoksia.

## Käyttö

```bash
pip install pyyaml
python3 scripts/validate.py
```

## Tuotemäärittely

Visio, käyttäjät, roadmap ja riskit: [docs/product/](docs/product/README.md).

Lait ja hankintaehdot (tietosuoja, saavutettavuus, tiedonhallinta, hankintalaki):
[docs/compliance/](docs/compliance/README.md).

Vertailu Moodle CodeRunneriin ja tehtävien vienti CodeRunner-kysymyksiksi:
[docs/product/coderunner.md](docs/product/coderunner.md).

## Arkkitehtuuri

Pino: Next.js + TypeScript, PostgreSQL, Redis-jono ja itse ylläpidetty go-judge-sandbox
ja LTI 1.3 -integraatio Moodleen. Katso [docs/architecture.md](docs/architecture.md).

## Tekoälyagentit

Projekti rakennetaan Claude Coden ja muiden agenttien avulla. Agenttien työohjeet ovat
tiedostossa [CLAUDE.md](CLAUDE.md).

## Lisenssi

- Lähdekoodi: [MIT](LICENSE)
- Tehtäväsisältö (`exercises/`): [CC BY 4.0](exercises/LICENSE)
