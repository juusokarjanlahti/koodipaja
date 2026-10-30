# Lait

Roolit kaikessa alla olevassa: **AMK** on asiakas ja tietojen rekisterinpitäjä,
**Koodipaja** on palvelun toimittaja ja henkilötietojen käsittelijä.

> Ei oikeudellista neuvontaa. Katso [README](README.md).

## 1. Tietosuoja: GDPR (EU 2016/679) ja tietosuojalaki (1050/2018)

**Koskee:** kyllä. Alusta käsittelee opiskelijoiden henkilötietoja (nimi, Moodlen
käyttäjätunniste, kurssi ja rooli, palautukset ja tulokset). Moodlesta kirjautuvien
sähköpostia ei tallenneta ([../product/moodle-lti.md](../product/moodle-lti.md)).

**Vaatimukset Koodipajalle**
- **Käsittelijäsopimus (GDPR 28 art.)** jokaisen AMK:n kanssa: käsittelyn tarkoitus, ohjeet,
  alikäsittelijät (palvelin- ja varmuuskopiopalvelut), tietoturva, avustaminen
  rekisteröityjen oikeuksissa sekä tietojen palautus ja poisto sopimuksen päättyessä.
- **Seloste käsittelytoimista (30 art.)** käsittelijän osalta.
- **Tietoturva (32 art.):** salaus siirrossa, pääsynhallinta, varmuuskopiot,
  palautumistestaus.
- **Tietoturvaloukkauksesta ilmoitetaan rekisterinpitäjälle ilman aiheetonta viivytystä
  (33 art.).** AMK:lla on 72 tuntia aikaa ilmoittaa valvontaviranomaiselle, joten
  toimittajan ilmoitusaika kirjataan sopimukseen selvästi tätä lyhyemmäksi.
- **Tietojen minimointi:** vain tarpeelliset tiedot. Ei analytiikkaa, ei kolmansia osapuolia.
- **Tiedot EU:ssa:** palvelimet ja varmuuskopiot EU:n alueella (CLAUDE.md:n periaate).

**Tila:** #7, #32, #33.

## 2. Saavutettavuus: digipalvelulaki (306/2019)

**Koskee:** kyllä. Lain 2 §:n mukaan viranomaista koskevia säännöksiä sovelletaan myös
ammattikorkeakoululain mukaisiin ammattikorkeakouluihin, ja laki koskee viranomaisen
digitaalisia palveluja (3 §).

**Poikkeus, jota ei kannata käyttää:** laki ei koske opetusta varten tuotettuja
verkkosivuja, joita käyttää rajattu ryhmä rajatun ajan (3 § 2 mom.). Se voi kattaa
yksittäisen kurssin sisällön, mutta tuskin jatkuvasti käytössä olevaa alustaa. AMK:t
vaativat saavutettavuutta joka tapauksessa hankinnoissaan.

**Vaatimukset**
- **EN 301 549** eli käytännössä **WCAG 2.1 A- ja AA-tason** kriteerit.
- **Saavutettavuusseloste (9 §):** mitkä osat eivät täytä vaatimuksia ja miksi, miten
  sisällön saa vaihtoehtoisesti, sähköinen palautekanava ja linkki valvontaviranomaisen
  sivulle. Seloste on AMK:n vastuulla, mutta toimittaja tuottaa sen sisällön.
- **Palautteeseen vastataan 14 vuorokauden kuluessa.**
- **Valvoja:** Traficomin saavutettavuuden valvontayksikkö.

**Tunnettu puute:** koodieditori sieppaa Tab-näppäimen sisennykseen, joten pelkällä
näppäimistöllä liikkuva käyttäjä tarvitsee ohjeen editorista poistumiseen (Esc, sitten Tab)
tai erillisen pikanäppäimen. Korjataan tarinassa #29.

**Ei koske:** lain 3 a luku (esteettömyysdirektiivi 2019/882) koskee kuluttajapalveluja,
kuten verkkokauppaa ja pankkipalveluja, ei oppimisalustoja.

**Tila:** #6, #29, #30, #31.

## 3. Tiedonhallinta: tiedonhallintalaki (906/2019)

**Koskee:** kyllä. Laki koskee viranomaisia, ja ammattikorkeakoulut ovat lain 4 §:ssä
lueteltuja tiedonhallintayksiköitä.

**Mitä AMK joutuu vaatimaan toimittajalta**
- **13 §:** AMK:n on varmistettava hankinnoissaan, että järjestelmässä on asianmukaiset
  tietoturvatoimet. Toimittajalta pyydetään siis tietoturvakuvaus.
- **14 §:** luottamukselliset tiedot siirretään salattuna (HTTPS kaikkialla).
- **16 §:** käyttöoikeudet määritellään tehtävien mukaan (opiskelija, opettaja, ylläpitäjä).
- **17 §:** käyttölokit järjestelmistä, joihin kirjaudutaan. Lokeista pitää selvitä
  tietojen käyttö ja luovutukset sekä teknisten virheiden syyt.
- **5 §:** AMK:n tiedonhallintamalliin tarvitaan kuvaus järjestelmästä ja sen tietovarannoista.

**Tila:** käyttölokit #44, tietoturvakuvaus #45.

## 4. Evästeet: laki sähköisen viestinnän palveluista (917/2014), 205 §

**Koskee:** kyllä, kaikkia verkkopalveluja.

**Sääntö:** suostumusta ei tarvita evästeelle, joka on välttämätön käyttäjän nimenomaisesti
pyytämän palvelun tarjoamiseksi. Analytiikka vaatii yleensä suostumuksen. Traficomin ohjeen
mukaan pitkäkestoinen "muista minut" -kirjautuminen ei ole automaattisesti välttämätön.

**Koodipajassa:** ainoa eväste on kirjautumisen istuntoeväste, eikä analytiikkaa käytetä,
joten evästebanneria ei tarvita. Istunnon kesto on rajattu 12 tuntiin, jotta eväste on
selvästi välttämätön eikä pitkäkestoinen "muista minut" -kirjautuminen. **Pidä näin:** jos
alustaan joskus lisätään analytiikkaa tai muita kuin välttämättömiä evästeitä, tarvitaan
suostumus.

## 5. Kyberturvallisuuslaki (124/2025)

**Koskee:** todennäköisesti ei suoraan. Laki pantiin voimaan 8.4.2025 NIS2-direktiivin
toimeenpanona, eikä koulutus ole direktiivin toimialoissa (tutkimus on liitteessä II).
Asia kannattaa tarkistaa Traficomin ohjeista.

**Välillisesti:** jos asiakas kuuluu lain piiriin, se arvioi toimittajiensa
kyberturvallisuuden (9 §, toimitusketju). Sama tietoturvakuvaus kuin kohdassa 3 riittää
lähtökohdaksi.

## 6. Tekijänoikeus: tekijänoikeuslaki (404/1961)

- **Tehtäväsisältö:** CC BY 4.0. Ulkopuolisilta sisällöntuottajilta vaaditaan vahvistus,
  että sisältö on omaa ja julkaistavissa samalla lisenssillä (esim. DCO-merkintä
  commitissa). Kaupallisilta alustoilta kopioitua sisältöä ei hyväksytä (CLAUDE.md).
- **Lähdekoodi:** MIT.
- **Opiskelijan koodi:** tekijänoikeus säilyy opiskelijalla. Käyttöehdoissa todetaan, että
  koodia käsitellään vain arviointia ja opettajan palautetta varten.

## 7. Tekoälyasetus (EU 2024/1689)

**Koskee:** ei nyt. Alusta ei käytä tekoälyä ajonaikaisesti, ja agentteja käytetään vain
kehitystyössä.

**Miksi tämä on tärkeää:** tekoälyjärjestelmät, joilla arvioidaan oppimistuloksia, on
asetuksen liitteessä III luokiteltu suuririskisiksi. Jos alustaan lisätään esimerkiksi
tekoälyn antama arvio tai pisteytys, se toisi mukaan raskaat vaatimukset (riskienhallinta,
dokumentaatio, ihmisen valvonta). Nykyinen periaate välttää tämän.

## 8. Ammattikorkeakoululaki (932/2014)

Viralliset opintosuoritukset kirjaa AMK omaan opintohallintojärjestelmäänsä. Koodipaja ei
ole suoritusrekisteri. Se tuottaa tulokset, jotka opettaja siirtää Moodlen kautta
(LTI 1.3, arvosanapalvelu AGS, epic #4).

## Lähteet

- [Laki digitaalisten palvelujen tarjoamisesta 306/2019 (Edilex)](https://www.edilex.fi/saadoskokoelma/20190306.pdf)
- [Digipalvelulain vaatimukset toimijoille (saavutettavuusvaatimukset.fi)](https://saavutettavuusvaatimukset.fi/fi/digipalvelulain-vaatimukset-toimijoille)
- [Laki julkisen hallinnon tiedonhallinnasta 906/2019](https://laki.ai/fi/lainsaadanto/saadoskokoelma/2019/906)
- [Traficom: Evästeohjeistus palveluntarjoajille](https://www.traficom.fi/sites/default/files/media/file/Evästeohjeistus_palveluntarjoajille.pdf)
- [NIS2 Suomessa (Legiscope)](https://www.legiscope.com/blog/nis2-suomessa.html)
