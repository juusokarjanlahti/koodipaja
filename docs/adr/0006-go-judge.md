# ADR 0006: go-judge korvaa Judge0:n koodin suoritusympäristönä

- Tila: hyväksytty
- Päivämäärä: 2026-10-30
- Päättäjä: projektin omistaja
- Korvaa: ADR 0005:n päätöksen 1 (Judge0 pidetään) ja 2 (oma Judge0-kielikuva)

## Tausta

Selvitys lokakuussa 2026 (Git-historiat, koodimuutokset ilman README-päivityksiä):

| Projekti | Koodicommitit 2025 / 2026 | Huomio |
|---|---|---|
| Judge0 | 3 / 0 | Viimeinen koodimuutos huhtikuu 2024 (v1.13.1). Yksi ylläpitäjä, painopiste maksullisessa pilvipalvelussa. Vaatii cgroup v1:n, kielet vuodelta 2020 |
| criyle/go-judge | 104 / 64 | REST-rajapinta, MIT, cgroup v1 ja v2, v1.13.3 |
| ioi/isolate | 45 / 48 | Judge0:n sisäinen eristystyökalu; cgroup v2 vuodesta 2023 |
| google/nsjail | 32 / 173 | Matalan tason eristys |
| DMOJ/judge-server | 5 / 56 | Kokonainen arvioija, AGPL |
| Piston | 2 / 0 | Kehitys pysähtynyt |

Judge0:n ongelmat olivat siis sen kääreessä, eivät eristyksessä: cgroup v1 -vaatimus
(nykyiset Ubuntu- ja Debian-versiot käyttävät v2:ta), vanhat kieliversiot (Python 3.8:n tuki
päättyi 2024) ja yhden ylläpitäjän riippuvuus.

## Päätös

1. **go-judge on oletusajopalvelu** (`RUNNER=go-judge`). Judge0 jää valittavaksi
   (`RUNNER=judge0`, Docker Compose -profiili `judge0`), kunnes go-judge on todettu
   tuotannossa.
2. **Sovellus puhuu ajopalvelulle yhden rajapinnan kautta** (`app/src/lib/runner`):
   `RunRequest` sisään, `RunResult` ulos. Vaihto toiseen ajopalveluun koskee vain yhtä
   moduulia.
3. **Kielten käännös- ja ajokomennot ovat yhdessä tiedostossa** `infra/languages.json`,
   jota validointi (`scripts/validate.py`), fake-Judge0 ja go-judge-asiakas lukevat.
   Aiemmin samat komennot oli kirjoitettu kolmeen paikkaan.
4. **Käännettävät kielet ajetaan kahdessa sandbox-vaiheessa:** käännös tallentaa
   tuloksensa go-judgen välimuistiin, ja ajo kopioi sen sisään. Molemmat vaiheet ovat
   eristettyjä; kääntäjälläkään ei ole verkkoa.
5. **Kieliversiot** tulevat omasta kuvasta (`infra/go-judge/Dockerfile`): Python 3.13,
   Node.js 22 LTS, TypeScript 5, OpenJDK 21, GCC 14, Rust stable.

## Vaihtoehdot (arvio 1–10)

- **9, go-judge:** aktiivinen, valmis rajapinta, cgroup v2, MIT. Kielet määritellään itse.
- **8, oma ohut palvelu isolaten päälle:** luotettava eristys, mutta palvelukerros olisi
  omaa ylläpidettävää koodia.
- **5, Judge0 omalla kielikuvalla (ADR 0005):** toimii, mutta cgroup v1 ja pysähtynyt
  kehitys jäävät riskeiksi.
- **5, DMOJ:** kokonainen arvioija eikä pelkkä ajopalvelu; AGPL.
- **4, nsjail:** liian matala taso suoraan käytettäväksi.

## Mitä on testattu

- **go-judge v1.13.3 ajettiin oikeana sandboxina** (julkaisubinääri, tarkistussumma
  varmistettu). Kaikki 21 tehtävää seitsemällä kielellä läpäisevät `npm run runner-check`
  -tarkistuksen: mallivastaukset, väärät ja hyväksyttävät ratkaisut.
- **Sandboxin turvatestit** menevät läpi: verkko ei ole käytettävissä, isäntäkoneen
  tiedostot eivät näy, järjestelmähakemistot ovat vain luku -tilassa, prosessien määrä,
  muisti ja suoritusaika on rajattu.
- **Koko sovellus** (worker, smoke-testi ja Playwright) toimii go-judgea vasten.
- **CI** käynnistää go-judgen jokaisessa pull requestissa (`infra/go-judge/dev.sh`) ja ajaa
  samat tarkistukset. CI-ympäristö käyttää cgroup v2:ta, kehitysympäristö v1:tä.

## Mitä ei ole testattu

- **Tuotantokuva `infra/go-judge/Dockerfile`** on luonnos: sitä ei voitu rakentaa
  ympäristössä, jossa se kirjoitettiin (Docker Hub estetty). Sama työkaluketjujen rakenne on
  testattu CI:ssä dev-skriptin kautta.
- **Kuormitus** (tenttipiikki) on testaamatta, katso #35.

## Seuraukset

- `infra/judge0-languages/` (oma Judge0-kielikuva) jää käyttämättömäksi ja poistetaan, kun
  Judge0-tuki poistetaan.
- Uuden kielen lisääminen: lisää se `infra/languages.json`-tiedostoon ja tuotantokuvaan.
- Sandboxissa ajettavan koodin käyttäjä on uid 1536 omassa nimiavaruudessaan, ja
  go-judge-palvelu itse tarvitsee root-oikeudet (privileged-kontti) luodakseen nimiavaruudet
  ja cgroupit. go-judge pidetään omassa verkossaan, ja rajapinta on suojattu tokenilla.
