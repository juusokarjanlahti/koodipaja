# ADR 0003: Joustava tulosteen vertailu oletuksena

- Tila: hyväksytty
- Päivämäärä: 2026-10-30

## Tausta

Tarkka merkkivertailu hylkää ratkaisuja, joissa tehtävän idea on ymmärretty mutta tuloste
eroaa välimerkissä, kirjainkoossa, välilyönnissä tai rivinvaihdossa. Aloittelija käyttää
silloin aikaa tulosteen hiomiseen, jolla ei ole opetusarvoa ([Aino](../product/kayttajat.md)).
Tyypillinen esimerkki: `input("Mikä on nimesi? ")` on oikeaa Pythonia, mutta tuottaa
kysymyksen ja tervehdyksen samalle riville, koska syöte ei näy tulosteessa.

## Päätös

Jokaisella tehtävällä on `output_match`-asetus:

- **`lenient` (oletus):** verrataan sisältöä, ei muotoilua.
- **`exact`:** verrataan tarkasti (rivien loppuvälilyönnit ja lopun rivinvaihdot ohitetaan).
  Käytetään, kun muotoilu on itse opetettava asia, esimerkiksi f-merkkijonot, taulukoiden
  tasaus tai "tulosta kahdella desimaalilla".

### Joustavan vertailun säännöt

1. Kirjainkoko ohitetaan.
2. Tulosteesta poimitaan **sanat** (kirjainjonot, myös ääkköset) ja **luvut**
   (`12`, `-4`, `3.14`). Kaikki muu ohitetaan: välimerkit, välilyönnit ja rivinvaihdot.
3. Miinusmerkki kuuluu lukuun vain, jos sen edellä ei ole kirjainta, numeroa tai pistettä:
   `Summa: -4` antaa luvun `-4`, mutta `5-3` antaa luvut `5` ja `3`. Plusmerkki ohitetaan.
4. Sanojen ja lukujen järjestyksen ja määrän pitää täsmätä täsmälleen.
5. Lukuja verrataan tekstinä: `4` ja `4.0` ovat eri asia, koska kokonais- ja liukuluvun
   ero on usein juuri opetettava asia.

### Tulos opiskelijalle

- **Tarkka vastaavuus:** "Läpi".
- **Vain joustava vastaavuus:** "Läpi (pieni muotoiluero)". Testi lasketaan läpäistyksi, ja
  opiskelija näkee odotetun ja oman tulosteensa vierekkäin, mutta mitään ei tarvitse korjata.
- **Ei vastaavuutta:** "Väärä tuloste" kuten ennenkin.

## Seuraukset tehtävien laadunvarmistukselle

- **Väärien ratkaisujen (`wrong/`) pitää olla käsitteellisiä virheitä,** kuten unohdettu
  tyyppimuunnos, väärä silmukkaehto tai kovakoodattu vastaus. Pelkkä muotoiluvirhe ei ole
  enää "väärä".
- **Uusi kansio `accepted/`:** ratkaisuja, joissa on muotoiluero mutta jotka on tarkoitus
  hyväksyä. Validointi varmistaa, että ne menevät läpi. Näin joustavuus on testattu eikä
  vahingossa kiristy.
- **Mallivastauksen pitää täsmätä tarkasti,** jotta odotetut tulosteet ovat
  johdonmukaisia mallivastauksen kanssa.
- `scripts/validate.py` ja sovelluksen `src/lib/grading/normalise.ts` toteuttavat samat
  säännöt, ja yhteiset testitapaukset varmistavat sen.

## Hylätyt vaihtoehdot

- **Joustava vertailu kaikkialle ilman valintaa:** joissain tehtävissä muotoilu on oppimistavoite.
- **Samankaltaisuusprosentti (esim. 95 %):** epäselvä raja, ja yksi väärä luku voi jäädä
  huomaamatta. Sana- ja lukutason vertailu on ennustettava ja selitettävä.
- **Tekoälyn arvio "riittävän oikeasta":** ei ennustettava, ja tekoälyasetus luokittelee
  oppimistulosten arvioinnin suuririskiseksi ([lait](../compliance/lait.md)).
