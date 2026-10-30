# ADR 0004: Suunnitelma kommentteina ja häivytettävä suunnitelmarunko

- Tila: hyväksytty
- Päivämäärä: 2026-10-30
- Päättäjä: projektin omistaja

## Tausta

Aloittelija yrittää pitää työmuistissa yhtä aikaa ongelman, ratkaisusuunnitelman ja
syntaksin. Kun suunnitelma kirjoitetaan näkyviin omalla kielellä ennen koodia, työmuistia
vapautuu syntaksille, ja välitavoitteiden nimeämisestä (subgoal labeling) on vahvaa
näyttöä ohjelmoinnin opetuksessa.

## Päätökset

1. **Suunnitelma kirjoitetaan kommentteina editoriin,** ei erilliseen paneeliin. Se pysyy
   näkyvissä koko ajan, ei vaadi uutta käyttöliittymää ja vastaa ammattilaisten tapaa
   (comment-first).
2. **Alkuvaiheen tehtävissä on valmis suunnitelmarunko, joka häivytetään kurssin
   edetessä.** Tehtävän laatija päättää rungon `scaffold`-kentällä:
   - `full`: pohjakoodissa numeroidut askeleet kommentteina
   - `outline`: vain askelten otsikot tai osa askeleista, opiskelija täydentää
   - `none` (oletus): ei runkoa
3. **Laatijalla on ensisijainen päätäntävalta** siihen, miten tehtävä pilkotaan ja kuinka
   paljon tukea annetaan.
4. **Opiskelija voi halutessaan pilkkoa tehtävän itse:** "Suunnittele"-painike lisää
   editoriin tyhjän numeroidun suunnitelmapohjan. Sen käyttö on vapaaehtoista eikä
   vaikuta arviointiin.
5. **Ei tekoälyä:** suunnitelmaa ei tarkisteta eikä tehtävää pilkota tekoälyllä
   ajonaikaisesti. Suunnitelma on ajattelun työkalu, ei arvioitava tuotos.

## Avoimet kysymykset

- **Tehtävän askeleet omine testeineen** ("Askel 2/3 valmis") on yhä harkinnassa. Päätös
  tehdään myöhemmin omalla ADR:llään.
- **Järjestä suunnitelma -tehtävät** ovat hyvä idea, mutta toteutustapa ratkaisee.
  Vaihtoehdot ja avoimet kysymykset on kirjattu tarinaan #71.

## Seuraukset

- `scripts/validate.py` tarkistaa, että `full`- ja `outline`-tehtävien pohjakoodissa on
  numeroituja suunnitelmakommentteja (`# 1. ...`).
- Nykyiset kaksi tehtävää ovat ensimmäisen viikon tehtäviä, joten niille tulee `full`-runko.
