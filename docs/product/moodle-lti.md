# Koodipaja Moodleen (LTI 1.3)

Opiskelija ja opettaja avaavat Koodipajan Moodle-kurssilta ilman erillisiä tunnuksia.
Tämä ohje on Moodlen ylläpitäjälle ja Koodipajan ylläpitäjälle. Tekniset speksit:
[kirjautuminen](../specs/lti-launch.md) ja [arvosanat](../specs/lti-grades.md).

**Testattu:** Moodle 4.5.15, opiskelija ja opettaja, arvosana arviointikirjaan, lokakuu 2026.

## Mitä toimii nyt

- Kirjautuminen Moodlesta (LTI 1.3 launch). Koodipaja avaa aktiviteettiin liitetyn tehtävän.
- Rooli tulee Moodlesta kurssikohtaisesti: opettaja (Instructor, Content Developer,
  Teaching Assistant) tai opiskelija.
- Arvosana siirtyy Moodlen arviointikirjaan palautuksen jälkeen (Assignment and Grade
  Services). Siirtyy **paras** tulos (läpi menneet testit / kaikki testit), joten myöhempi
  huonompi yritys ei laske arvosanaa. Epäonnistunut lähetys yritetään uudelleen viisi kertaa.
- **Tulossa:** tehtävän valinta Moodlen aktiviteettivalitsimesta (Deep Linking, #24).

## Mitä Koodipaja saa ja tallentaa

| Moodlen lähettämä tieto | Tallennetaan | Miksi |
|---|---|---|
| Käyttäjän tunniste (`sub`, Moodlen sisäinen numero) | kyllä | sama käyttäjä tunnistetaan seuraavalla kerralla |
| Nimi | kyllä | opettaja tunnistaa opiskelijan tuloksista |
| Sähköposti | **ei** | ei tarvita; asetus kannattaa jättää pois päältä |
| Kurssin tunniste ja nimi | kyllä | tulokset kurssikohtaisesti |
| Rooli kurssilla | kyllä | opettajan näkymät |

Moodleen Koodipaja lähettää vain käyttäjän tunnisteen ja pisteet.

## 1. Koodipajan ylläpitäjä: avain

```bash
cd app && npm run lti:keygen >> .env.local     # LTI_PRIVATE_KEY
```

Aseta myös `APP_URL` palvelun julkiseen osoitteeseen (esim. `https://koodipaja.example.fi`).

## 2. Moodlen ylläpitäjä: työkalun rekisteröinti

**Site administration → Plugins → Activity modules → External tool → Manage tools →
configure a tool manually**

| Asetus | Arvo |
|---|---|
| Tool name | Koodipaja |
| Tool URL | `https://koodipaja.example.fi/api/lti/launch` |
| LTI version | LTI 1.3 |
| Public key type | Keyset URL |
| Public keyset | `https://koodipaja.example.fi/api/lti/jwks` |
| Initiate login URL | `https://koodipaja.example.fi/api/lti/login` |
| Redirection URI(s) | `https://koodipaja.example.fi/api/lti/launch` |
| Tool configuration usage | Show in activity chooser and as a preconfigured tool |
| Default launch container | **New window** |
| Privacy: Share launcher's name with tool | Always |
| Privacy: Share launcher's email with tool | Never |
| Services: IMS LTI Assignment and Grade Services | Use this service for grade sync and column management |
| Privacy: Accept grades from the tool | Always (tai "Delegate to teacher") |

Tallennuksen jälkeen **View configuration details** näyttää *Client ID*:n ja
*Deployment ID*:n. Lähetä ne Koodipajan ylläpitäjälle.

**Miksi uusi ikkuna:** upotettuna (iframe) Koodipajan istuntoeväste on selaimen kannalta
kolmannen osapuolen eväste, jonka nykyselaimet estävät. Koodipaja tunnistaa upotetun
käynnistyksen ja neuvoo vaihtamaan asetuksen.

## 3. Koodipajan ylläpitäjä: Moodlen rekisteröinti

```bash
cd app && npm run lti:register -- --moodle https://moodle.example.fi --client-id <Client ID> --deployment <Deployment ID>
```

Moodlen osoitteiden oletukset ovat `/mod/lti/auth.php`, `/mod/lti/token.php` ja
`/mod/lti/certs.php`. Muille alustoille anna `--issuer`, `--auth-login-url`,
`--auth-token-url` ja `--jwks-url` erikseen.

## 4. Opettaja: aktiviteetti kurssille

**Lisää aktiviteetti → Koodipaja**. Kunnes Deep Linking on valmis, kirjoita
*Tool URL* -kenttään tehtävän osoite, esim.
`https://koodipaja.example.fi/exercises/01-tervehdys`. Ilman osoitetta opiskelija päätyy
Koodipajan etusivulle. Arvosanaa varten aktiviteetin asetuksissa *Grade*-tyypiksi
"Point" (esim. 100). Moodle skaalaa Koodipajan pisteet (esim. 3/4 → 75).

## Arvosanojen tila

```bash
cd app && npm run lti:grades              # odottavat ja epäonnistuneet
cd app && npm run lti:grades -- --retry   # lähetä epäonnistuneet uudelleen
```

Moodlen pitää pystyä hakemaan Koodipajan julkinen avain (`/api/lti/jwks`) tokenia varten.
Tuotannossa osoite on tavallinen HTTPS-osoite; testi-Moodlessa sisäverkon osoitteet ja muut
portit kuin 80 ja 443 pitää sallia (`curlsecurityblockedhosts`, `curlsecurityallowedport`).

## Paikallinen kokeilu

```bash
php tools/moodle/lti-setup.php --moodle=/polku/moodle --app=http://localhost:3000
```

Luo testi-Moodleen työkalun (arvosanat päällä), kurssin, arvioitavan aktiviteetin sekä käyttäjät `kp-student` ja
`kp-teacher` (salasana `Koodipaja-1`) ja tulostaa `lti:register`-komennon. Vain
testiympäristöön.
