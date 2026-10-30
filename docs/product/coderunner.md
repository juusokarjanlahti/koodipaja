# Koodipaja ja Moodle CodeRunner

[CodeRunner](https://moodle.org/plugins/qtype_coderunner) on Moodlen kysymystyyppi
ohjelmointitehtäville. Se on maksuton, avoin (GPL), aktiivisesti kehitetty (Canterburyn
yliopisto, Uusi-Seelanti; 178 koodicommitia vuonna 2025) ja käytössä Moodle.orgin mukaan
3 577 sivustolla. Koordinaattorin ensimmäinen kysymys on todennäköisesti: "Miksi emme
vain käyttäisi CodeRunneria?"

Vertailu perustuu kokeiluun lokakuussa 2026: Moodle 4.5.15, CodeRunner 5.10.6 ja Jobe 2.2.2
asennettiin paikallisesti, ja Koodipajan tehtävät vietiin CodeRunneriin.

## Vertailu

| | CodeRunner | Koodipaja |
|---|---|---|
| **Hinta ja lisenssi** | Maksuton, GPL | Maksuton, MIT; tehtävät CC BY 4.0 |
| **Valmis sisältö** | Muutama esimerkkikysymys; opettaja kirjoittaa jokaisen tehtävän ja testit itse | Python-peruskurssin 15 tehtävää ja esimerkit kuudella muulla kielellä, kaikki koneellisesti validoitu |
| **Integraatio** | Toimii Moodlen sisällä: arvosanat, tentit ja Safe Exam Browser suoraan | Moodle LTI 1.3:n kautta: kirjautuminen toimii, arvosanojen palautus työn alla ([moodle-lti.md](moodle-lti.md)) |
| **Tulosteen vertailu** | Tarkka (`EqualityGrader`) tai kirjainkoon ja ylimääräiset välilyönnit ohittava (`NearEqualityGrader`); välimerkit ja rivitys ratkaisevat | Oletuksena vain sanat ja luvut (ADR 0003); "pieni muotoiluero" ei hylkää |
| **Palaute** | Testitaulukko; oletuksena kaikki tai ei mitään ja punainen "Your code must pass all tests to earn any marks" | "Ei vielä läpi" -sävy, yleisimmät virheet selitetty suomeksi |
| **Kokeilu ennen palautusta** | Precheck ajaa esimerkkitestit | Aja omalla syötteellä, ei tallennu |
| **Oppimisen tuki** | Pohjakoodin voi antaa valmiiksi | Suunnitelmarunko, muistilista opituista malleista, edistymisnäkymä |
| **Kielet** | Jobe: C, C++, Java, Python, Node.js, PHP, Octave, Pascal | Python, JavaScript, TypeScript, C, C++, Java, Rust (go-judge) |
| **Joustavuus** | Erittäin suuri: mallipohjat (Twig), omat arvioijat, satunnaistus | Rajattu: syöte/tuloste-tehtävät |
| **Ylläpito** | Moodle-lisäosa + Jobe-palvelin (Apache, PHP); Jobella yksi ylläpitäjä | Oma palvelu + go-judge-sandbox |

**Arvio (1–10) AMK:n Python-peruskurssin näkökulmasta**
- **CodeRunner, 7:** paras, jos opettaja haluaa kaiken Moodlessa ja ehtii kirjoittaa tehtävät
  itse. Integraatio ja tenttiominaisuudet ovat valmiina ja koeteltuja.
- **Koodipaja, 7:** paras, jos valmis sisältö ja aloittelijan kokemus ratkaisevat. Moodle-
  integraatio ja opettajan näkymä puuttuvat vielä.

**Johtopäätös: ei joko–tai.** Koodipajan vahvuus on sisältö ja pedagogiikka, CodeRunnerin
integraatio. Siksi tehtäväkirjasto viedään myös CodeRunner-muotoon: opettaja voi käyttää
kirjastoa sieltä, missä hän jo on, ja Koodipaja-alusta tarjoaa lisäksi paremman
harjoitteluympäristön.

## Tehtävien vienti CodeRunneriin

```bash
python3 scripts/export_coderunner.py --language python -o koodipaja-python.xml
```

Moodlessa: **Kysymyspankki → Tuo → Moodle XML** ja valitse tiedosto. Kysymykset tulevat
kategoriaan `Koodipaja/<kieli>`.

**Mitä vienti tekee**
- Tehtävänanto (Markdown), pohjakoodi suunnitelmarunkoineen ja mallivastaus siirtyvät
  sellaisenaan. Lähde ja CC BY 4.0 -lisenssi lisätään tehtävänannon loppuun.
- Näkyvät testit näkyvät, piilotetut piilotetaan; ensimmäinen näkyvä on esimerkki.
- Virhesakko on 0 %: harjoittelussa yritykset eivät laske arvosanaa.
- **Python-tehtävät käyttävät samaa joustavaa vertailua kuin Koodipaja** CodeRunnerin
  mallipohja-arvioijan avulla, ja opiskelija näkee huomautuksen muotoiluerosta.
- **Muut kielet** käyttävät `NearEqualityGrader`-arvioijaa, joka ei ohita välimerkkejä eikä
  rivitystä. Tämä on tunnettu ero.
- TypeScript ja Rust jäävät pois, koska Jobessa ei ole niille vakiokieltä.

**Testattu:** kaikki 19 vietyä kysymystä tuotiin oikeaan Moodleen ja arvioitiin CodeRunnerin
omalla arviointikoneella Jobea vasten (`tools/moodle/coderunner-check.php`): mallivastaukset ja
hyväksyttävät ratkaisut menevät läpi, väärät eivät.

**Huomioita Moodlen ylläpitäjälle**
- CodeRunnerin asetus `jobe_host` on pelkkä palvelimen osoite (esim. `jobe.example.fi:4000`);
  CodeRunner lisää polun itse.
- Moodle estää oletuksena HTTP-pyynnöt sisäverkon osoitteisiin ja muihin kuin portteihin 80
  ja 443 (`curlsecurityblockedhosts`, `curlsecurityallowedport`). Jobe-palvelimen osoite ja
  portti pitää sallia.
