# Riskit

Asteikko 1–5. **T** = todennäköisyys, **V** = vaikutus, **P** = T × V. Arvio päivitetään
jokaisen milestonen lopussa.

| # | Riski | T | V | P | Lievennys |
|---|---|---|---|---|---|
| 1 | **Hankinta- ja myyntisykli.** AMK:n päätöksenteko, budjettikausi ja hankintalaki venyttävät ensimmäisen kaupan 6–12 kuukauteen. | 4 | 4 | 16 | Maksuton pilotti opettajan kautta ennen hankintaa. Hinnoittelu pienhankinnan rajoihin. Valmis dokumenttipaketti (tietosuoja, saavutettavuus, tietoturva) lyhentää IT:n arviointia. Avoin koodi mahdollistaa myös itse ylläpidon ilman hankintaa. |
| 2 | **Yhden hengen ylläpitäjä.** Kehitys, tuki ja tuotanto yhden ihmisen varassa; sairastuminen tai työpaikka pysäyttää palvelun. | 4 | 5 | 20 | Kaikki ajettavissa Docker Composella ja dokumentoitu (runbook). Avoin koodi ja sisältö: asiakkaalla on aina exit-polku. Pilottiin vain yksi kurssi kerrallaan. Etsitään toinen ylläpitäjä tai kumppani ennen M3:a. |
| 3 | **Sandbox-tietoturva.** Opiskelijakoodi pääsee eristyksestä, kuormittaa palvelun tai käyttää verkkoa. | 2 | 5 | 10 | Aktiivisesti ylläpidetty go-judge (ADR 0006), verkko pois, CPU-/muisti-/prosessirajat, vain luku -tiedostojärjestelmä. Sandbox omassa verkossaan ilman pääsyä tietokantaan. Sandboxin pakotestit (`npm run runner-check`) jokaisessa PR:ssä oikeaa sandboxia vasten. go-judge-versiopäivitysten seuranta. |
| 4 | **Tietosuoja ja GDPR.** Opiskelijadatan virheellinen käsittely tai puutteelliset sopimukset estävät käyttöönoton. | 3 | 4 | 12 | Tietojen minimointi (LTI:stä vain tarvittava), data vain EU:ssa, ei kolmannen osapuolen analytiikkaa, säilytysajat ja poisto määritelty. Tietosuojaseloste ja käsittelijäsopimuspohja valmiina M2:ssa. |
| 5 | **Saavutettavuus.** Koodieditori ja palaute eivät täytä WCAG 2.1 AA -vaatimuksia; julkisen sektorin palveluna tämä on lakisääteinen vaatimus. | 3 | 4 | 12 | Koodieditorin näppäimistö- ja ruudunlukijatuki varmistetaan aikaisin. Automaattiset tarkistukset CI:ssä, manuaalinen testaus ruudunlukijalla, saavutettavuusseloste ennen pilottia. |
| 6 | **Sisällön laatu.** Virheellinen testi tai epäselvä tehtävänanto syö luottamuksen nopeasti; tekoälyn luonnostelema sisältö voi olla uskottavan näköisesti väärää. | 3 | 4 | 12 | CI-validointi (mallivastaus läpi, väärät vastaukset kiinni), pakollinen ihmisen katselmointi, opiskelijan "ilmoita virheestä" -kanava pilotissa, nopea korjaussykli Gitin kautta. |
| 7 | **Kilpailijat.** Viope (kaupallinen, laaja valmis sisältö), ViLLE (Turun yliopiston kehittämä, laajasti käytössä) ja A+ (Aalto-yliopiston avoin alusta) ovat jo käytössä ja tuttuja opettajille. | 4 | 3 | 12 | Ei kilpailla sisällön määrällä vaan avoimuudella, Moodle-integraatiolla, hinnalla ja ylläpidettävyydellä. Rajataan AMK:n ohjelmoinnin perusopetukseen. Sisältö on aina omaa; kilpailijoiden tehtäviä ei kopioida eikä niihin viitata. Viestintä asiallista: kerrotaan, mitä Koodipaja tekee, ei arvioida muita. |
| 8 | **Kuormapiikit.** Tentin alkaessa satoja palautuksia minuutissa, palaute hidastuu tai palvelu kaatuu. | 3 | 4 | 12 | BullMQ-jono tasaa piikit, kuormatesti ennen tenttitilaa (M3), go-judge-instanssien skaalaus, jonon pituuden valvonta. |
| 9 | **Ajopalvelun ylläpito.** Sandbox-projekti lopettaa kehityksen tai jää jälkeen kernel- ja kieliversioista, kuten Judge0 teki (viimeinen koodimuutos 2024, vaati cgroup v1:n). go-judgella on aktiivinen kehitys mutta yksi pääkehittäjä. | 2 | 4 | 8 | Sovellus käyttää ajopalvelua vain yhden rajapinnan kautta (`app/src/lib/runner`), ja kielet on määritelty itse (`infra/languages.json`), joten vaihto koskee yhtä moduulia. Varavaihtoehto on oma ohut palvelu isolaten päälle (ADR 0006). Projektin aktiivisuus tarkistetaan milestone-katselmoinneissa. |

## Seuranta

Riskit, joiden P ≥ 12, käsitellään jokaisen milestonen katselmoinnissa. Uusi riski lisätään
tähän taulukkoon PR:llä.
