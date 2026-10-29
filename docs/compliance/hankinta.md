# Hankinta: miten AMK ostaa palvelun

> Ei oikeudellista neuvontaa. Katso [README](README.md).

## Avoin lähdekoodi ei vaadi hankintaa, palvelu vaatii

Koodipajan lähdekoodi ja tehtävät ovat ilmaisia. AMK voi ottaa alustan käyttöön omille
palvelimilleen ilman hankintaa. **Hankinta syntyy, kun AMK ostaa jotain:** ylläpidetyn
palvelun, tuen, palvelutasolupauksen tai räätälöinnin.

## Hankintalaki (1397/2016)

**Koskee AMK:ta käytännössä kyllä.** Hankintayksiköitä ovat myös julkisoikeudelliset
laitokset: yleisen edun vuoksi perustetut, pääosin julkisesti rahoitetut tai valvotut
toimijat. AMK:t rahoitetaan pääosin valtion varoin. Tarkista asiakaskohtaisesti.

**Kynnysarvot (arvonlisäverottomina)**

| Hankinta | Kynnysarvo | Voimassa |
|---|---|---|
| Kansallinen, tavarat ja palvelut | 60 000 € | 1.1.2022 alkaen |
| EU, tavarat ja palvelut, muut kuin valtion keskushallinnon hankintayksiköt | 216 000 € | 1.1.2026 alkaen |

- **Alle 60 000 €:** pienhankinta. Hankintalakia ei sovelleta, mutta AMK noudattaa omaa
  hankintaohjettaan (usein useampi tarjous tai suorahankinta perusteluin).
- **Hankinnan arvo lasketaan koko sopimuskaudelta optioineen,** ei vuosihinnasta.
  Esimerkiksi 15 000 €/v neljän vuoden sopimuksena on 60 000 €, eli kansallinen kynnysarvo
  ylittyy. **Hinnoittele ensimmäiset sopimukset niin, että koko kauden arvo jää alle
  60 000 €,** jolloin raskas kilpailutus vältetään.
- **Uudistus voimaan 18.6.2026:** suuremmat hankinnat jaetaan osiin pk-yritysten hyväksi, ja
  EU-kynnysarvon ylittävä avoin menettely toistetaan yleensä, jos tarjouksia tulee vain yksi.
  Markkinakartoitukset yleistyvät, ja niihin kannattaa osallistua: se on pienen toimittajan
  helpoin tapa päästä tarjoajaksi.

## Sopimusehdot: JIT 2015 (JHS 166)

Julkisen hallinnon IT-hankinnoissa käytetään yleisesti JIT 2015 -ehtoja. Niihin kuuluvat
yleiset ehdot ja erityisehdot muun muassa verkon yli toimitettaville palveluille (SaaS),
avoimelle lähdekoodille ja ketterälle kehitykselle. Asiakas tarjoaa todennäköisesti näitä
ehtoja sopimuspohjaksi, joten ne kannattaa lukea etukäteen. Tärkeimmät kohdat pienelle
toimittajalle:

- **Vastuunrajoitus:** sovi enimmäisvastuuksi esimerkiksi vuoden palvelumaksut.
- **Palvelutaso:** saatavuus, vasteajat ja sopimussakot. Lupaa vain se, minkä yksi ylläpitäjä
  pystyy pitämään (esim. arkipäivät ja lukukausien kriittiset ajat erikseen).
- **Tietojen palautus sopimuksen päättyessä:** avoin lähdekoodi ja dokumentoitu tietomalli
  tekevät tästä helppoa, ja se on myyntivaltti.
- **Avoimen lähdekoodin erityisehdot:** sopivat Koodipajaan suoraan, koska koodi on jo MIT-lisensoitu.

## Tarkistuslista: asiakirjat, joita hankinnassa kysytään

| Asiakirja | Sisältö | Tila |
|---|---|---|
| Palvelukuvaus | Mitä palvelu tekee ja mitä ei, roolit, integraatiot (Moodle LTI 1.3) | #46 |
| Hinnoittelu | Hinta per opiskelija tai per kurssi, sopimuskausi, koko kauden arvo alle 60 000 € | #46 |
| Käsittelijäsopimus ja alikäsittelijät | GDPR 28 art., palvelimet EU:ssa | #32 |
| Tietosuojaseloste (AMK:lle pohja) | Mitä tietoja, miksi, kuinka kauan | #32 |
| Säilytysajat ja poisto | Palautusten ja tulosten säilytys, poisto sopimuksen päättyessä | #33 |
| Saavutettavuusseloste | WCAG 2.1 AA -arvio, puutteet, palautekanava | #31 |
| Tietoturvakuvaus | Arkkitehtuuri, sandbox, salaus, pääsynhallinta, lokit, varmuuskopiot, haavoittuvuuksien hallinta; Julkri-pohjainen itsearvio | #45 |
| Palvelutaso ja häiriötiedotus | Saatavuus, tuki, häiriöviestintä, runbook | #36 |
| Exit-suunnitelma | Tietojen vienti ja siirto, avoin lähdekoodi | #46 |
| Yrityksen tiedot | Y-tunnus, ennakkoperintärekisteri, vastuuvakuutus | Yrityksen perustamisen yhteydessä |

## Lähteet

- [EU-kynnysarvot muuttuvat 1.1.2026 (hankinnat.fi)](https://www.hankinnat.fi/ajankohtaista/2025/eu-kynnysarvot-muuttuvat-112026)
- [Julkiset hankinnat (Yrittäjät)](https://www.yrittajat.fi/tietopankki/liiketoiminta/julkiset-hankinnat/)
- [Hankintayksiköt (hankinnat.fi)](https://www.hankinnat.fi/mika-julkinen-hankinta/hankintayksikot)
- [Uusi hankintalaki voimaan (TEM)](https://tem.fi/-/uusi-hankintalaki-voimaan-lisaa-kilpailua-julkisiin-hankintoihin)
- [JIT 2015 -ehdot (Hansel)](https://www.hansel.fi/uutiset/julkisen-hallinnon-it-hankintojen-yleiset-sopimuse)
