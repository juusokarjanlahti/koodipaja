# Oppimispolku

Miten [pedagogiset periaatteet](visio.md#pedagogiset-periaatteet) toteutuvat kurssin
aikana, kun opiskelija kohtaa ohjelmoinnin ensimmäistä kertaa ja on todennäköisesti
tulevaisuudessa osa ohjelmistokehitystiimiä.

## Lähtökohta: kaksi tavoitetta, yksi alusta

- **Ensikertalainen** tarvitsee mahdollisimman vähän kuormaa: selkeän näkymän, pieniä
  onnistumisia ja apua, jota ei nolota pyytää.
- **Tuleva kehittäjä** tarvitsee totuttelua IDE:hen, terminaaliin, testiraportteihin ja
  lokeihin.

Ratkaisu on **tuen vähittäinen purkaminen**: sama alusta kypsyy opiskelijan mukana.
Käyttöliittymä lainaa ammattilaisympäristön käytännöt alusta asti (asettelu,
pikanäppäimet, oikeat virheilmoitukset), mutta piilottaa monimutkaisuuden, kunnes
opiskelija on valmis. Omia käsitteitä ei keksitä asioille, joilla on alalla vakiintunut
nimi (Nielsenin heuristiikka 4: johdonmukaisuus ja standardit), vaan ne selitetään.

## Kitka pois kaikesta, mikä ei ole ajattelua

Opiskelijan huomio on rajallinen. Kaikki, mikä ei tue ajattelua tai päätöksentekoa,
tehdään niin vaivattomaksi kuin mahdollista:

- **Tehtävänannon tekstit kopioi yhdellä napautuksella tai vetämällä editoriin.**
  Merkkijonon kirjoittaminen tehtävänannosta käsin on puhdasta kitkaa. Toimii myös
  näppäimistöllä (Enter) ja kosketusnäytöllä.
- **Tulosteen muotoilua ei hiota** ([ADR 0003](../adr/0003-joustava-tulosteen-vertailu.md)).
- **Ei asennuksia eikä erillisiä tunnuksia:** selain ja Moodle-kirjautuminen riittävät.
- **Kokeilu ilman palautusta** (#55) ja **selitetyt virheilmoitukset** (#52).

Kitkaa ei poisteta sieltä, missä se on oppimista: algoritmin keksiminen, tietotyyppien
erottaminen ja virheen jäljittäminen kuuluvat opiskelijalle.

## Kurssin vaiheet

| Vaihe | Näkymä | Tehtävätyypit | Tulosteen vertailu | Tarinat |
|---|---|---|---|---|
| **Alku** (viikot 1–2) | Aloitus: editori, Aja, syöte, tuloste, selitetyt virheet | Ennusta tuloste, pienet kirjoita ohjelma -tehtävät | Joustava | #55, #56, #60, #52 |
| **Keskivaihe** (3–6) | Kehittäjä: VS Code -tyylinen asettelu, Terminaali- ja Ongelmat-paneelit | Parsons, kirjoita ohjelma, löydä vika lokista | Joustava, muotoilutehtävissä tarkka | #57, #58, #61, #62 |
| **Loppu** (7–8) | Tiimi: testiraportti CI-tyyliin, palautushistoria committeina, muiden ratkaisujen lukeminen | Laajemmat ohjelmat, haasteet | Tarkka, kun määrittelyn noudattaminen on osa tavoitetta | #57, #53, #64 |
| **Siirtymä** | Oma VS Code ja terminaali | Sama tehtävä ladattuna, pytest-testit | Samat säännöt kuin alustalla | #59 |

Vaiheet ovat oletuksia: opettaja valitsee kurssin tason, ja opiskelija voi vaihtaa
näkymää itse milloin vain.

## Ensimmäinen kohtaaminen ohjelmoinnin kanssa

- **Asennusta ei tarvita.** Kaikki toimii selaimessa ja mobiilissa.
- **Kahden minuutin johdanto** siihen, mitä ohjelma, syöte ja tuloste ovat (#56).
- **Kokeilu ennen arviointia:** "Aja omalla syötteellä" on erillinen palautuksesta (#55).
  Aloittelija oppii kokeilemalla, eikä jokainen kokeilu ole arvioitava palautus.
- **Lukeminen ennen kirjoittamista:** ensimmäiset tehtävät voivat olla ennusta tuloste
  -tehtäviä, joissa ei tarvitse kirjoittaa tyhjästä (#60).
- **Syntaksi on este, jonka yli autetaan:** yleisimmät virheilmoitukset selitetään
  suomeksi, ja alkuperäinen virheilmoitus näkyy aina (#52).

## Kohti tiimityötä

- **Lokien ja tracebackien lukeminen** harjoitellaan omana taitonaan (#62).
- **Terminaalinäkymä** näyttää oikeat komennot ja tulosteet ilman oikeaa komentotulkkia,
  joten totuttelu onnistuu ilman tietoturvariskiä (#58).
- **Koodia luetaan:** läpäisyn jälkeen opiskelija voi lukea muiden ratkaisuja ja opettajan
  valitsemia esimerkkejä (#53). Aloittelijalle tämä tarkoittaa hyvien esimerkkien
  lukemista, ei tyylivaatimuksia omalle koodille.
- **Siirtymä omiin työkaluihin** tapahtuu jo kurssilla: tehtävän voi ladata ja ajaa
  testit omassa VS Codessa (#59).

## Eri arvosanatavoitteet

Samalla kurssilla on opiskelijoita, jotka tavoittelevat arvosanaa 1, 3 tai 5. Ilman
suunnittelua alusta palvelee helposti vain keskimmäistä.

| Tavoite | Kokemus ja riski | Mitä alusta tekee |
|---|---|---|
| **5** | Motivoitunut; tylsistyy mekaanisiin tehtäviin, turhautuu epävarmuuteen siitä, onko ratkaisu täysin oikein | Haasteet ja laajennukset (#64), muiden ratkaisujen lukeminen (#53), Tiimi-näkymä aikaisin |
| **3** | Pragmaattinen; suurin kipu on epäselvyys siitä, riittääkö tekemä | Näkyvä polku arvosanoihin ja edistyminen kohti tavoitetta (#63) |
| **1** | Kiireinen tai epävarma; yksi käsittämätön virhe voi johtaa keskeyttämiseen | Lyhyin selkeä polku, nopeat onnistumiset, Pyydä apua (#49), selitetyt virheet (#52) |

Periaatteet kaikille:
- **Edistyminen näytetään suhteessa omaan tavoitteeseen, ei muihin.** Ei sijoituslistoja
  (#63). Oman tavoitteen voi halutessaan asettaa, ja se näkyy vain opiskelijalle (#65).
- **Arviointikriteerit päättää opettaja** opetussuunnitelman mukaan. Alusta vain näyttää ne.
- **Perustaso mittaa ydinosaamista,** ei pelkkää määrää: muuttujat, ehdot, silmukat ja
  tietotyypit.
- **Reiluus:** joustava vertailu ja opettajan käsin hyväksyntä poistavat turhaa kitkaa,
  mutta eivät helpota arvosanaa 5, koska haasteissa ratkaisee algoritmin oikeellisuus.

## Myöhemmin

- **Askel askeleelta -visualisointi** (muuttujien arvot suorituksen aikana, Python Tutor
  -tyyliin): pedagogisesti erinomainen tietotyyppien ja suorituksen ymmärtämiseen, mutta
  raskas rakentaa.

## Hylätyt vaihtoehdot

- **Oikea selainterminaali komentotulkilla:** tietoturvariski ja monimutkaisuus, eikä
  Judge0 ole interaktiivinen. Terminaalinäkymä antaa saman totuttelun.
- **Sijoituslistat ja pisteiden vertailu:** lannistavat juuri niitä, joille ensimmäinen
  kokemus on ratkaiseva, ja ovat ristiriidassa periaatteen 1 kanssa.
