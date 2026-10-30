// Käsitteellinen virhe: rivejä ei muuteta luvuiksi, joten + liittää merkkijonot yhteen.
const rivit = require("fs").readFileSync(0, "utf8").split("\n");

let total = 0;
for (const rivi of rivit) {
  if (rivi === "0") break;
  total = total + rivi;
}
console.log(`Summa: ${total}`);
