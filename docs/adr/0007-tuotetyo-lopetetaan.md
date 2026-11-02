# ADR 0007: Tuotetyö lopetetaan, projekti viimeistellään portfolioksi

- Tila: hyväksytty
- Päivämäärä: 2026-11-02
- Päättäjä: projektin omistaja
- Korvaa: roadmapin milestonet M1–M4 ([roadmap.md](../product/roadmap.md))

## Tausta

Koodipajan tavoite oli maksuton ja avoin vaihtoehto Viopelle AMK:n Python-peruskurssille
([visio.md](../product/visio.md)). Issueiden katselmoinnissa 2.11.2026 selvisi, että tällainen
vaihtoehto on jo olemassa ja käytössä:

- **Helsingin yliopiston mooc.fi** (Agile Education Research -ryhmä) julkaisee maksutta
  suomenkielisen Ohjelmoinnin MOOCin ja englanninkielisen Python Programming MOOCin joka vuosi
  (2021–2026). Tehtävät tarkistetaan automaattisesti TMC:llä (TestMyCode).
- **AMK:t käyttävät sitä jo kohdekurssilla.** Laurealla on TMC:ssä 13 kurssia vuosille
  2025–2026, ja suurin osa niistä on Python-perusteita. SeAMK ajaa Ohjelmoinnin perusteet 1
  Python -kurssinsa TMC:ssä vuosina 2024 ja 2025. Laurean Python-kurssi käytti vielä
  2019–2022 Viopea.
- **Viope ei ole katoamassa:** esimerkiksi Laurean Java Programming -kurssi käyttää sitä
  vuonna 2026. Kilpailija on kuitenkin Python-peruskurssilla mooc.fi, ei Viope.
- **mooc.fi toteuttaa jo saman tuen purkamisen polun** kuin [oppimispolku.md](../product/oppimispolku.md):
  Python-kurssin osat 1–3 tehdään selaimessa, ja osasta 4 alkaen siirrytään VS Codeen ja
  TMC-lisäosaan.
- mooc.fi puuttui riskirekisteristä ([riskit.md](../product/riskit.md), riski 7). Rekisterin
  kaksi suurinta riskiä, yhden hengen ylläpito (P = 20) ja hankinta (P = 16), koskevat
  ylläpidettyä palvelua, eikä kumpikaan pienene.

mooc.fin ero Koodipajaan ei ole työkalu vaan sisällön määrä, vuosien ylläpito ja
tutkimusryhmän resurssit. Yhden hengen projekti ei kuro sitä eroa umpeen.

## Päätös

1. **Tuotepolku lopetetaan.** Pilotti, hankinta- ja tietosuoja-aineisto, tenttitila,
   uudet tehtävätyypit ja laajentuminen (M1–M4) eivät jatku. Niiden avoimet issuet
   suljetaan tilalla "not planned" ja viittauksella tähän päätökseen.
2. **Projekti viimeistellään portfolioksi** epicin #125 mukaan: julkinen demo keksityllä
   datalla, README, tarina agenttien ohjaamisesta ja ydinosien syväluku. Lisäksi tehdään
   demon käyttökokemukseen vaikuttavat #120 (luonnos ei katoa) ja #122–#124 (pienet korjaukset).
3. **Valmistumisen jälkeen repo arkistoidaan** (vain luku), ja README kertoo tilan.

## Seuraukset

- Palvelua ei oteta käyttöön oikeiden opiskelijoiden kanssa, joten oikeita henkilötietoja ei
  käsitellä. Demo käyttää vain keksittyä dataa (#127).
- Agentit ottavat työn alle vain milestonen **Demo ja paketointi** issueita ([CLAUDE.md](../../CLAUDE.md)).
- Koodi (MIT) ja tehtävät (CC BY 4.0) pysyvät avoimina, joten kuka tahansa voi jatkaa niistä.
- Päätös voidaan avata uudella ADR:llä, jos AMK:n opettaja kertoo tarvitsevansa jotain, mitä
  mooc.fi ei tarjoa. mooc.fin Moodle-integraatiota ja sisällön lisenssiä ei selvitetty.

## Hylätyt vaihtoehdot

- **Jatkaminen tuotteena Moodle-integraation varassa:** kannattaisi vain, jos opettaja
  vahvistaa tarpeen, ja yhden hengen ylläpidon riski jäisi silti.
- **Lopettaminen heti:** valmis työ jäisi ilman näytettävää demoa, vaikka demo on epicin #125
  arvion mukaan noin 2–3 päivän työ.

## Lähteet

- [TMC: Laurea Ammattikorkeakoulu](https://tmc.mooc.fi/org/laurea)
- [TMC: SeAMK](https://tmc.mooc.fi/org/seamk)
- [TMC: MOOC-organisaation kurssit](https://tmc.mooc.fi/org/mooc)
- [Laurea: Python ohjelmointi 2019–2020 (Viope)](https://ops.laurea.fi/realization/32478?lang=en)
- [Laurea: Python-ohjelmointi 2022 (Viope)](https://ops.laurea.fi/realization/41184)
- [Laurea: Java Programming 2026 (Viope)](https://ops.laurea.fi/realization/54336?lang=en)
- [Python Programming MOOC 2024, osa 4: Visual Studio Code](https://programming-24.mooc.fi/part-4/1-vscode)
