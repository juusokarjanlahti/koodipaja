# ADR 0002: Kaikki tehtäväsisältö on julkista, myös tenttitehtävät

- Tila: hyväksytty
- Päivämäärä: 2026-10-30
- Päättäjä: projektin omistaja

## Tausta

Issue #37 ehdotti, että tenttitehtävien ratkaisut säilytettäisiin erillään julkisesta
reposta. Se olisi ristiriidassa periaatteen "kaikki sisältö Gitissä CC BY 4.0
-lisenssillä" kanssa ja vaatisi toisen, yksityisen sisältövaraston ylläpitoa.

## Päätös

Kaikki tehtävät, testitapaukset ja mallivastaukset ovat julkisia ja CC BY 4.0
-lisensoituja, myös tenttikäyttöön tarkoitetut. Erillistä yksityistä varastoa ei tehdä.

## Perustelut

- Salaaminen ei estä huijaamista. Tekoäly ratkaisee alkeistason tehtävät sekunneissa
  riippumatta siitä, onko ratkaisu julkisesti saatavilla.
- Yksi julkinen varasto pitää ylläpidon, laadunvarmistuksen (CI) ja lisenssin yksinkertaisina.
- Avoimuus on alustan kilpailuetu kaupallisiin vaihtoehtoihin nähden.

## Seuraukset

- Tentin luotettavuus perustuu valvontaan, ei salassapitoon. Oppilaitos järjestää
  valvotun tenttitilanteen (esim. tenttiakvaario tai valvottu luokka), ja alusta tukee sitä
  aikarajalla, tehtävien lukituksella ja palautusten estolla ajan päätyttyä.
- Piilotetut testitapaukset säilyvät. Ne eivät ole salaisuus, koska ne näkyvät reposta,
  mutta ne estävät tulosteen kovakoodaamisen näkyvien esimerkkien perusteella.
- Opettaja voi muunnella tehtävää (syötteet, rajat) tenttiä varten. Tehtävävariaatiot
  ovat mahdollinen myöhempi lisäys.
