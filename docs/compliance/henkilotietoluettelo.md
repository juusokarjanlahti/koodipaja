# Henkilötietoluettelo

Mitä henkilötietoja Koodipaja tallentaa, miksi, kuka niitä näkee ja milloin ne poistetaan.
Luettelo on koottu tietokantaskeemasta (`app/src/lib/db/schema.ts`), ja sen on tarkoitus
pysyä ajan tasalla: **jokainen henkilötietoja koskeva muutos (uusi taulu, uusi kenttä, uusi
näkymä) päivittää tämän tiedoston samassa PR:ssä.** Pohjana ovat tietosuojaseloste (#32) ja
säilytysaikojen suunnittelu (#33).

> **Ei oikeudellista neuvontaa.** Luokittelu on tehty teknisin perustein eikä sitä ole
> tarkistanut juristi. Henkilötieto on mikä tahansa tieto, joka liittyy tunnistettuun tai
> tunnistettavissa olevaan henkilöön. Opiskelijan palautus, joka on tallennettu hänen
> tunnukseensa ja jonka opettaja näkee nimellä, on siis henkilötieto, vaikka koodi itsessään
> olisi mitätön. EU:n tuomioistuin on katsonut myös tenttivastaukset henkilötiedoiksi
> (C-434/16, Nowak).

## Roolit

- **Rekisterinpitäjä:** ammattikorkeakoulu. Oikeusperuste on sen lakisääteinen tehtävä
  (opetus), eli opiskelijoilta ei pyydetä suostumusta.
- **Henkilötietojen käsittelijä:** Koodipajan ylläpitäjä AMK:n puolesta. Tähän tarvitaan
  käsittelijäsopimus (#32).
- **Alikäsittelijät:** hosting-palvelu (UpCloud tai Hetzner, vain EU). Muita ei ole: ei
  kolmannen osapuolen analytiikkaa, ei tekoälypalveluita ajonaikaisesti.

## Mitä tallennetaan

| Tieto | Taulu ja kenttä | Mihin tarvitaan | Kuka näkee | Poistuu |
|---|---|---|---|---|
| Näyttönimi (Moodlen `name`, enintään 200 merkkiä) | `users.display_name` | Opettaja tunnistaa opiskelijan etenemisnäkymässä | Opiskelija itse, kurssin opettaja | Käyttäjän poiston yhteydessä |
| Moodlen anonyymi käyttäjätunnus (`sub`) | `lti_identities.sub`, `lti_grade_syncs.platform_user_id` | Kirjautuminen ja arvosanojen palautus oikealle opiskelijalle | Vain järjestelmä ja ylläpitäjä | Käyttäjän poiston yhteydessä |
| Sähköposti | `users.email` | Vain kehityskirjautuminen (`DEV_LOGIN`), ei koskaan tuotannossa | Kehittäjä | – (ei tuotannossa) |
| Rooli kurssilla | `course_memberships.role`, `last_launch_at` | Opettajan ja opiskelijan oikeudet | Kurssin opettaja | Kurssin poiston yhteydessä |
| Palautettu koodi ja ajon tulos | `submissions`, `submission_results` (koodi, tulosteet, virheilmoitukset) | Automaattinen palaute, eteneminen, opettajan apu | Opiskelija itse, kurssin opettaja | Käyttäjän poiston yhteydessä |
| Arvosanan siirron tila | `lti_grade_syncs` (pisteet, tila, virhe, ajankohta) | Arvosanan vienti Moodleen, opettajan siirtonäkymä | Kurssin opettaja | Käyttäjän poiston yhteydessä |
| Muistilistan omat muistiinpanot | `concept_notes.note` | Opiskelijan oma muistilista | Vain opiskelija itse | Käyttäjän poiston yhteydessä |
| Avunpyyntö: viesti ja vastaus | `help_requests` (viesti, vastaus, laji, tila) | Opiskelija pyytää opettajaa katsomaan ratkaisua (#49) | Pyytävä opiskelija, kurssin opettaja | Opiskelija voi perua avoimen pyynnön (poistetaan heti); muuten käyttäjän poiston yhteydessä |
| Istuntoeväste | Selaimen eväste, 12 h | Kirjautuminen | Opiskelija itse | Vanhenee 12 tunnissa |

Hyväksytyt tulosteet (#50, suunnitteilla, `docs/specs/help-requests.md`) tallentavat vain
tulosteen tiivisteen, hyväksyneen opettajan ja perustelun, **ei opiskelijaa eikä hänen
koodiaan**. Perustelukentässä varoitetaan lainaamasta opiskelijan koodia.

## Mitä ei tallenneta

- Opiskelijan sähköpostia, puhelinnumeroa tai henkilötunnusta LTI-kirjautumisessa.
- Kirjautumisen sijaintia, laitetietoja tai selainhistoriaa.
- Analytiikkaa, mainostunnisteita tai kolmansien osapuolten evästeitä.
- Mitään, mitä tekoäly käsittelee ajonaikaisesti (tuote ei kutsu kielimalleja).

## Avoimet kohdat

Rehellinen tilanne: nämä on päätettävä ennen pilottia.

| Kohta | Tila | Issue |
|---|---|---|
| Säilytysajat (esim. kuinka kauan palautuksia säilytetään kurssin päätyttyä) | Ei päätetty, ei automaattista poistoa | #33 |
| Opiskelijan tietojen luovutus ja poisto (rekisteröidyn oikeudet) | Ei toteutettu | #33 |
| Käyttölokit (kuka katsoi kenen tietoja) | Ei toteutettu | #44 |
| Tietosuojaseloste ja käsittelijäsopimuspohja | Ei kirjoitettu | #32 |
| Varmuuskopioiden sisältämien tietojen poisto | Ei suunniteltu | #33, #36 |

## Ylläpito

Kun lisäät taulun tai kentän, joka voi liittyä henkilöön:

1. Lisää rivi yllä olevaan taulukkoon (tieto, kenttä, tarkoitus, kuka näkee, milloin poistuu).
2. Tarkista, että vain tarvittavat roolit näkevät sen (404 muille, kuten opettajanäkymissä).
3. Mainitse PR:n alussa, että muutos koskee henkilötietoja (CLAUDE.md, työsääntö 4).
