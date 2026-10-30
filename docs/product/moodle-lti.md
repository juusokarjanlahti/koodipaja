# Koodipaja Moodleen (LTI 1.3)

Opiskelija ja opettaja avaavat Koodipajan Moodle-kurssilta ilman erillisiä tunnuksia.
Tämä ohje on Moodlen ylläpitäjälle ja Koodipajan ylläpitäjälle. Tekninen speksi:
[../specs/lti-launch.md](../specs/lti-launch.md).

**Testattu:** Moodle 4.5.15, opiskelija ja opettaja, lokakuu 2026.

## Mitä toimii nyt

- Kirjautuminen Moodlesta (LTI 1.3 launch). Koodipaja avaa aktiviteettiin liitetyn tehtävän.
- Rooli tulee Moodlesta kurssikohtaisesti: opettaja (Instructor, Content Developer,
  Teaching Assistant) tai opiskelija.
- **Tulossa:** tehtävän valinta Moodlen aktiviteettivalitsimesta (Deep Linking, #24) ja
  arvosanojen palautus arviointikirjaan (#25).

## Mitä Koodipaja saa ja tallentaa

| Moodlen lähettämä tieto | Tallennetaan | Miksi |
|---|---|---|
| Käyttäjän tunniste (`sub`, Moodlen sisäinen numero) | kyllä | sama käyttäjä tunnistetaan seuraavalla kerralla |
| Nimi | kyllä | opettaja tunnistaa opiskelijan tuloksista |
| Sähköposti | **ei** | ei tarvita; asetus kannattaa jättää pois päältä |
| Kurssin tunniste ja nimi | kyllä | tulokset kurssikohtaisesti |
| Rooli kurssilla | kyllä | opettajan näkymät |

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
| Privacy: Accept grades from the tool | Never (kunnes #25 on valmis) |

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
Koodipajan etusivulle.

## Paikallinen kokeilu

```bash
php tools/moodle/lti-setup.php --moodle=/polku/moodle --app=http://localhost:3000
```

Luo testi-Moodleen työkalun, kurssin, aktiviteetin sekä käyttäjät `kp-student` ja
`kp-teacher` (salasana `Koodipaja-1`) ja tulostaa `lti:register`-komennon. Vain
testiympäristöön.
