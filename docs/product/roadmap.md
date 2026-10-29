# Roadmap

Milestonet vastaavat GitHubin milestoneja `M1 MVP` … `M4 Laajentuminen` ja labeleita
`M1-mvp` … `M4-laajentuminen`. Ajoitus on suuntaa-antava; milestone on valmis, kun sen
poistumiskriteerit täyttyvät, ei päivämäärän perusteella.

Tilamerkinnät: ✅ valmis · 🚧 työn alla · ⬜ ei aloitettu

**Kohdekurssi M1–M2:** Ohjelmoinnin perusteet Pythonilla (noin 5 op / 8 viikkoa, 60–80
stdin/stdout-tehtävää: muuttujat, ehtolauseet, silmukat, listat, merkkijonot, funktiot,
sanakirjat). Vain Python; muut kielet M4:ssä.

## M1 MVP: toimiva alusta

Epicit: #1, #2, #3

**Tavoite:** opiskelija voi tehdä Python-tehtäviä selaimessa ja saa automaattisen palautteen.
Kirjautuminen on vielä kehityskäyttöön tarkoitettu.

| Sisältö | Tila |
|---|---|
| Tehtäväformaatti (`exercise.yaml`, mallivastaus, väärät vastaukset) | ✅ main |
| CI-validointi (`scripts/validate.py`) | ✅ main |
| Paikallinen infra: PostgreSQL, Redis, eristetty Judge0 (Docker Compose) | 🚧 `phase-1-infra` |
| Next.js-sovellus, tietokantaskeema, tehtävien tuonti Gitistä | 🚧 `phase-2-app` |
| Koodieditori, palautus jonon kautta Judge0:aan, testikohtainen palaute | 🚧 vaihe 3 |
| Kehityskirjautuminen | 🚧 vaihe 3 |
| Peruskurssin ensimmäiset moduulit, vähintään 15 tehtävää (muuttujat, ehtolauseet, silmukat) | ⬜ (2 valmiina) |
| Sandboxin pakotestit, tuotantokelpoinen EU-hosting | ⬜ |

**Poistumiskriteerit**
- Opiskelija voi kirjautua, avata tehtävän, palauttaa ja nähdä tuloksen jokaisesta testistä.
- Piilotetuista testeistä näytetään vain läpäisy, ei odotettua tulostetta.
- Palautteen p95-viive alle 5 s, sandboxin pakotestit menevät läpi.
- Peruskurssin ensimmäiset 15 tehtävää kirjastossa, CI-validoitu ja katselmoitu.
- Palvelu ajossa EU-palvelimella, varmuuskopiot ja palautus testattu.

## M2 Pilotti: yksi AMK, yksi kurssi

Epicit: #4, #5, #6, #7 (sekä #17, #19 epicistä #2)

**Tavoite:** yksi Ohjelmoinnin perusteet Pythonilla -toteutus ajetaan kokonaan Koodipajassa Moodlen kautta.

**Laajuus**
- LTI 1.3 -kirjautuminen Moodlesta (opiskelija ja opettaja roolit Moodlesta).
- Kurssit ja tehtäväsarjat, tehtävien liittäminen Moodlen aktiviteetteihin.
- Arvosanojen palautus Moodleen (LTI Assignment and Grade Services).
- Opettajan näkymä: kurssin eteneminen ja yksittäisen opiskelijan palautukset.
- Saavutettavuus WCAG 2.1 AA ja saavutettavuusseloste.
- Tietosuoja: tietosuojaseloste, käsittelijäsopimuspohja, säilytysajat ja poisto.
- Virheilmoituskanava tehtäville, palvelun valvonta.
- Kokonainen Python-peruskurssi: 60–80 tehtävää kaikista seitsemästä aihealueesta, tuotettu ja katselmoitu.

**Poistumiskriteerit**
- Kokonainen Python-peruskurssi kirjastossa (60–80 tehtävää, kaikki CI-validoituja ja katselmoituja).
- Pilottikurssi ajettu loppuun, mittarit kohdassa [visio.md](visio.md#onnistumisen-mittarit).
- AMK:n IT on hyväksynyt LTI-rekisteröinnin ja tietosuoja-aineiston.
- Saavutettavuusauditoinnissa ei kriittisiä puutteita.

## M3 Ensimmäinen maksava asiakas

Epicit: #8

**Tavoite:** palvelu on myytävissä ja ylläpidettävissä sopimuksen mukaisesti.

**Laajuus**
- Tenttitila: aikaraja, tehtävien lukitus, palautusten esto ajan päätyttyä, kuormatestattu.
- Laajempi kirjasto: peruskurssin tenttitehtävävaranto ja vaihtoehtoiset tehtävät, aihe- ja vaikeustasotunnisteet. Edelleen vain Python.
- Ylläpito: SLA, valvonta ja hälytykset, runbook, häiriötiedotteet, versiopäivitysprosessi.
- Myyntiaineisto: hinnoittelu, palvelukuvaus, tietoturvakuvaus.

**Poistumiskriteerit**
- Allekirjoitettu sopimus vähintään yhden AMK:n kanssa.
- Tentti ajettu tuotannossa ilman häiriöitä.
- Runbookin avulla toinen henkilö pystyy palauttamaan palvelun varmuuskopiosta.

## M4 Laajentuminen

Epicit: #9

**Tavoite:** muut kielet ja kurssit sekä yhteisö, joka tuottaa sisältöä.

**Laajuus**
- Muut kielet: Java, TypeScript ja C. Validointi, editorituki ja Judge0-kieliasetukset kielikohtaisesti.
- Jatkokurssit Python-peruskurssin päälle.
- Yhteisön tehtäväkirjasto: kontribuutio-ohje, katselmointiprosessi, opettajan oma fork.
- Mahdollisesti HAKA/SAML-kirjautuminen muille kuin Moodle-käyttäjille.

**Poistumiskriteerit**
- Vähintään kaksi kieltä tuotannossa.
- Vähintään 5 ulkopuolisen kontribuuttorin hyväksyttyä tehtävää.
