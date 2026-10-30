// Käsitteellinen virhe: merkkijono lisätään lukuun. TypeScript huomaa tämän jo käännöksessä.
import { readFileSync } from "fs";

const rivit: string[] = readFileSync(0, "utf8").split("\n");

let total = 0;
for (const rivi of rivit) {
  if (rivi === "0") break;
  total = total + rivi;
}
console.log(`Summa: ${total}`);
