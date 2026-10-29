# Visio

## Ongelma

Ammattikorkeakoulujen ohjelmointikurssit tarvitsevat paljon automaattisesti tarkastettavia
harjoitustehtäviä. Nykyiset vaihtoehdot ovat joko kaupallisia alustoja, joiden sisältö ja
hinnoittelu ovat suljettuja ja lisenssit kurssi- tai opiskelijakohtaisia, tai yliopistojen
omia järjestelmiä, joiden käyttöönotto vaatii omaa ylläpitoa. Opettaja ei voi helposti
muokata, jakaa tai viedä tehtäviä mukanaan, ja alustan vaihtaminen tarkoittaa sisällön
menettämistä.

## Kohdekäyttäjät

M1 ja M2 tähtäävät **yhteen konkreettiseen kurssiin: Ohjelmoinnin perusteet Pythonilla**
(AMK:n johdantokurssi, noin 5 op / 8 viikkoa, 60–80 automaattisesti tarkastettavaa
stdin/stdout-tehtävää: muuttujat, ehtolauseet, silmukat, listat, merkkijonot, funktiot,
sanakirjat). Kaikki MVP:n ja pilotin päätökset tehdään tämän kurssin tarpeista.

- **Opiskelija** Python-peruskurssilla, joka opettelee ohjelmoinnin perusteita ja tarvitsee nopeaa, selkeää palautetta.
- **Opettaja**, joka vetää Python-peruskurssia, kokoaa sen tehtävät ja seuraa opiskelijoiden etenemistä Moodlessa.
- **AMK:n koulutusteknologia- ja hankintavastaava**, joka vastaa integraatioista,
  tietosuojasta ja saavutettavuudesta.

Tarkemmat kuvaukset: [kayttajat.md](kayttajat.md).

## Arvolupaus

| | Kaupalliset alustat | Koodipaja |
|---|---|---|
| **Valmis sisältö** | Laaja, mutta suljettu ja lisensoitu | Avoin CC BY 4.0 -kirjasto, jonka jokainen tehtävä on koneellisesti validoitu; opettaja voi muokata ja forkata |
| **Hinta** | Lisenssimaksu per opiskelija tai kurssi | Ohjelmisto ja sisältö maksutta; maksullinen palvelu on ylläpidetty hosting ja tuki |
| **Avoimuus** | Suljettu koodi, tiedonsiirto vaikeaa | MIT-koodi, tehtävät Gitissä, itse ylläpidettävissä, ei toimittajaloukkua |
| **Tietosuoja** | Vaihtelee | Data vain EU:ssa, ei kolmannen osapuolen analytiikkaa, ei tekoälyä ajonaikaisesti |
| **Integraatio** | Usein oma kirjautuminen | Moodle LTI 1.3: ei erillisiä tunnuksia, arvosanat palautuvat Moodleen |

## Pedagogiset periaatteet

Nämä ohjaavat tehtävien sisältöä, palautteen sävyä ja kaikkia ominaisuuksia.

1. **Epäonnistuminen on osa oppimista, ei hävettävää.** Väärä vastaus, keskeneräinen
   ratkaisu tai se, ettei ymmärrä miksi tehtävä ei mene läpi, on tavallinen vaihe.
   Palaute kertoo, mitä ei vielä toimi, eikä tuomitse. Avun pyytäminen on normaali ja
   näkyvä toiminto, ei viimeinen keino. **Häpeän poistaminen ei tarkoita kamppailun
   poistamista:** sopiva vaikeus kuuluu oppimiseen, joten alusta tukee kamppailua
   (kokeilu, selitykset, apu) eikä palkitse ajattelematonta uudelleenpalauttamista.
   Harjoittelussa yritysten määrä ei vaikuta arvosanaan.
2. **Algoritmit ja tietotyypit ovat ydin, syntaksi on este, jonka yli autetaan.** Tehtävät
   mittaavat, osaako opiskelija jakaa ongelman askeliin ja erottaa tietotyypit toisistaan
   (esim. merkkijono vs. luku, kokonaisluku vs. liukuluku, lista vs. yksittäinen arvo).
   Syntaksi ei ole tavoite, mutta aloittelijat jumittuvat siihen eniten, joten
   virheilmoitukset selitetään eikä niitä sivuuteta. Tulosteen muotoilua ei hiota
   ([ADR 0003](../adr/0003-joustava-tulosteen-vertailu.md)), ja väärät
   esimerkkiratkaisut kuvaavat käsitteellisiä virheitä.
3. **Koodi kirjoitetaan myös muille luettavaksi.** Ohjelmointi on yhteistyötä:
   ratkaisua lukee opettaja, vertainen ja tuleva itse. Aloittelijalle tämä tarkoittaa
   ensin hyvien esimerkkien lukemista, ei tyylivaatimuksia omalle koodille.
4. **Ihminen päättää viime kädessä.** Automaattinen arviointi on apuväline. Opettaja voi
   aina katsoa yrityksiä ja hyväksyä ratkaisun omalla päätöksellään, ja päätös on
   perusteltu ja jäljitettävä. Jos opettaja joutuu pelastamaan usein, vika on tehtävässä.
5. **Lukeminen ennen kirjoittamista.** Koodin lukemisen ja jäljittämisen taito ennustaa
   kirjoittamisen taitoa. Kirjoita ohjelma -tehtävien rinnalla on ennusta tuloste-,
   järjestä rivit (Parsons)- ja löydä vika lokista -tehtäviä.
6. **Tuki puretaan vähitellen kohti oikeita työkaluja.** Ensikertalainen aloittaa
   yksinkertaisesta näkymästä, ja kurssin edetessä näkymä, vertailun tarkkuus ja
   palaute lähestyvät ammattilaisen ympäristöä (IDE, terminaali, testiraportit).

Miten periaatteet toteutuvat kurssin aikana: [oppimispolku.md](oppimispolku.md).

## Tavoitteet

1. Opiskelija pääsee tehtävään Moodlesta yhdellä klikkauksella ja saa palautteen sekunneissa.
2. Kirjastossa on kokonainen Python-peruskurssi, ja opettaja ottaa sen käyttöön alle tunnissa.
3. Tehtäväkirjaston laatu on mitattavaa: jokaisella tehtävällä on testit, mallivastaus ja
   tunnetut väärät vastaukset, jotka CI tarkistaa.
4. Palvelu on myytävissä AMK:lle hankintana, joka mahtuu pienhankinnan rajoihin.

## Ei-tavoitteet

- Ei muita ohjelmointikieliä kuin Python ennen M4:ää (Java, TypeScript, C siirtyvät laajentumisvaiheeseen).
- Ei jatkokurssien sisältöä (olio-ohjelmointi, tietorakenteet, tiedostot, verkko) ennen kuin peruskurssi on valmis.
- Ei täysimittaista oppimisalustaa (LMS). Moodle hoitaa kurssit, viestinnän ja arvioinnin kokonaisuuden.
- Ei tekoälyavustajaa tai LLM-pohjaista palautetta tuotteessa.
- Ei plagiaatintunnistusta MVP:ssä tai pilotissa.
- Ei omaa koodin suoritusympäristöä: käytetään Judge0:aa.
- Ei mobiilisovellusta; selainkäyttöliittymän on toimittava myös kapealla näytöllä.
- Ei kilpailijoiden sisällön kopiointia tai tuontia.

## Onnistumisen mittarit

**MVP (M1)**
- Opiskelija voi tehdä peruskurssin ensimmäiset moduulit (vähintään 15 tehtävää: muuttujat, ehtolauseet, silmukat) alusta loppuun selaimessa.
- Palautteen p95-viive alle 5 s normaalikuormalla.
- Kaikki kirjaston tehtävät läpäisevät CI-validoinnin.
- Sandboxin pakotestit (verkko, prosessipommi, muistiraja) eivät läpäise eristystä.

**Pilotti (M2)**
- Kokonainen Python-peruskurssi (60–80 katselmoitua tehtävää) kirjastossa.
- 1 AMK, 1 Ohjelmoinnin perusteet Pythonilla -toteutus, vähintään 30 aktiivista opiskelijaa.
- Vähintään 70 % opiskelijoista suorittaa yli puolet tehtävistä.
- Opiskelijakyselyn keskiarvo vähintään 4/5 kysymykseen "palaute auttoi korjaamaan virheen".
- Saatavuus kurssin aikana vähintään 99 %, ei tietoturva- tai tietosuojapoikkeamia.
- Saavutettavuusauditoinnissa ei kriittisiä WCAG 2.1 AA -puutteita.
- Opettaja haluaa jatkaa käyttöä seuraavalla toteutuksella.
