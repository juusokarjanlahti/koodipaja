# Tuotemäärittely

Korkean tason määrittely: mitä rakennetaan, kenelle ja missä järjestyksessä. Tekninen
arkkitehtuuri on tiedostossa [../architecture.md](../architecture.md), ominaisuuskohtaiset
tekniset speksit kansiossa `docs/specs/`.

| Dokumentti | Sisältö |
|---|---|
| [visio.md](visio.md) | Ongelma, arvolupaus, pedagogiset periaatteet, tavoitteet, ei-tavoitteet, mittarit |
| [kayttajat.md](kayttajat.md) | Persoonat: opiskelija, opettaja, AMK:n hankinta/IT, sisällöntuottaja |
| [oppimispolku.md](oppimispolku.md) | Kurssin vaiheet ensikertalaisesta tiimityöhön, näkymätasot, tehtävätyypit, arvosanatavoitteet |
| [roadmap.md](roadmap.md) | Milestonet M1–M4, laajuus, poistumiskriteerit ja tila |
| [coderunner.md](coderunner.md) | Vertailu Moodle CodeRunneriin ja tehtävien vienti CodeRunner-kysymyksiksi |
| [riskit.md](riskit.md) | Keskeiset riskit, todennäköisyys, vaikutus ja lievennys |

## Speksit ja GitHub-issuet

- **Milestone** (`M1 MVP` … `M4 Laajentuminen`) vastaa yhtä roadmapin vaihetta. Lisäksi
  issuessa on milestonea vastaava label (`M1-mvp`, `M2-pilotti`, `M3-asiakas`,
  `M4-laajentuminen`), jotta suodatus onnistuu myös ilman milestone-näkymää.
- **Epic** (label `epic`) on roadmapin kokonaisuus. Siinä on tavoite, laajuus, rajaukset,
  valmiin määritelmä, linkki tähän kansioon ja tehtävälista lapsi-storyista.
- **Story** (label `story`) on käyttäjätarina muodossa "Käyttäjänä haluan … jotta …" ja
  hyväksymiskriteerit tarkistuslistana. Jokainen story viittaa epiciinsä.
- **Aluelabel** (`alue:opiskelija`, `alue:opettaja`, `alue:sisalto`, `alue:infra`,
  `alue:tietoturva`, `alue:saavutettavuus`) kertoo, kenen näkökulmasta tai mihin osaan työ kohdistuu.

Ennen toteutusta storysta kirjoitetaan tekninen speksi PR:ään tai `docs/specs/`-kansioon
(ks. [CLAUDE.md](../../CLAUDE.md)). Kun määrittely muuttuu, päivitä ensin dokumentti ja sitten issuet.
