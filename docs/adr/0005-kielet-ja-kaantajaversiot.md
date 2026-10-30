# ADR 0005: Ohjelmointikielet ja kääntäjäversiot

- Tila: osittain korvattu: päätökset 1 ja 2 (Judge0 ja oma Judge0-kielikuva) korvattu
  [ADR 0006](0006-go-judge.md):lla. Kielivalikoima, tavoiteversiot ja kieliriippumattomuus ovat
  edelleen voimassa.
- Päivämäärä: 2026-10-30

## Tausta

Omistaja haluaa alustan tukevan kieliä, joita käytetään oikeissa projekteissa ja töissä
vuonna 2026: Python, C, C++, Rust, Java, JavaScript ja TypeScript. Pilotin sisältö pysyy
Python-peruskurssina, mutta moottorin pitää olla kieliriippumaton.

Selvitys lokakuussa 2026:

- Judge0:n uusin julkaisu on **v1.13.1 (17.4.2024)**. Sitä uudempaa ei ole.
- Judge0 CE 1.13:n kielet ovat vuoden 2020 tasolla: Python 3.8.1, Node.js 12.14,
  TypeScript 3.7.4, OpenJDK 13, Rust 1.40 ja GCC 9.2.
- **Python 3.8:n tuki päättyi lokakuussa 2024.** Se ei kelpaa opetukseen, jonka pitää
  valmistaa työelämään, eikä tietoturvasyistä.
- Vaihtoehtona tunnettu Piston tarjoaa uudempia versioita pakettienhallinnalla, mutta sen
  repositoriossa ei ole ollut muutoksia helmikuun 2025 jälkeen.

## Päätös

1. **Judge0 pidetään** suoritusympäristönä. Sen rajapinta, isolate-eristys, oma verkko ja
   resurssirajat ovat jo käytössä ja testattuja (ADR:t ja `docker-compose.yml`).
2. **Kielet päivitetään omalla Judge0-kuvalla,** johon asennetaan nykyiset versiot ja
   jonka kielet lisätään Judge0:n `languages`-tauluun omilla tunnisteilla (1000+).
   Luonnos: `infra/judge0-languages/`.
3. **Sovellus on kieliriippumaton:** kieli valitaan tehtävän `language`-kentästä, ja
   Judge0-tunniste haetaan asetuksesta `JUDGE0_LANGUAGE_IDS` (JSON). Oletuksena käytetään
   Judge0 CE 1.13:n tunnisteita, jotta kehitys toimii vakiokuvalla.
4. **Käännös- ja ajokomennot on määritelty yhdessä paikassa kolmesti samalla tavalla:**
   `scripts/validate.py` (CI ja tehtävien laatijat), `app/scripts/fake-judge0.mjs`
   (testit) ja oma Judge0-kuva (tuotanto). Muutettaessa päivitetään kaikki kolme.

### Tavoiteversiot (tuotantokuva)

| Kieli | Versio | Huomio |
|---|---|---|
| Python | 3.13 | |
| JavaScript | Node.js 22 LTS | syöte `fs.readFileSync(0)` |
| TypeScript | TypeScript 5, Node.js 22 | tyypit tarkistetaan käännöksessä (`strict`) |
| Java | OpenJDK 21 LTS | luokka `Main` |
| Rust | vakaa (stable) | edition 2021 |
| C / C++ | GCC 9.2 (Judge0) aluksi | C17 ja C++17 riittävät opetukseen; päivitys GCC 13:een myöhemmin, koska GCC:n kääntäminen vanhaan kuvaan on raskasta |

## Vaihtoehdot (arvio 1–10)

- **8, Judge0 ja oma kielikuva:** säilyttää testatun eristyksen ja rajapinnan; vaatii kuvan
  rakentamisen ja ylläpidon.
- **5, Piston:** uudemmat versiot pakettienhallinnalla, mutta ylläpito näyttää hiljentyneen,
  ja vaihto vaatisi uuden integraation ja eristyksen arvioinnin.
- **3, oma suoritusympäristö (isolate tai nsjail ja konttikuvat):** suurin tietoturvariski,
  ja juuri se, mitä arkkitehtuuripäätös välttää.
- **2, Judge0:n oletuskielet:** toimii heti, mutta Python 3.8 on tuen ulkopuolella, eivätkä
  versiot vastaa työelämää.

## Seuraukset

- Jokaisella kielellä on esimerkkitehtävä (`exercises/<kieli>/<kieli>-lukujen-summa`), jonka
  validointi kääntää ja ajaa, ja smoke-testi ajaa ne koko putken läpi.
- CI asentaa kääntäjät (GCC, OpenJDK 21, Rust, Node.js ja TypeScript).
- Oma Judge0-kuva on testattava omistajan koneella (cgroup v1, `docs/local-dev.md`) ennen
  tuotantokäyttöä. Seuranta: issue #75.
- Virheilmoitusten selitykset (#52) ja käsitekortit (#69) ovat toistaiseksi vain Pythonille.
