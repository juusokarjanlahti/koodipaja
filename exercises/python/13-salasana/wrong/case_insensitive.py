# Käsitteellinen virhe: lower() tekee vertailusta kirjainkoosta riippumattoman, vaikka tehtävä kieltää sen.
while input().lower() != "avaa":
    print("Väärin, yritä uudelleen")
print("Tervetuloa!")
