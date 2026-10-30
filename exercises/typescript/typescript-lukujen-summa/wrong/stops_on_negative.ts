// Käsitteellinen virhe: silmukka lopetetaan kaikilla ei-positiivisilla luvuilla.
import { readFileSync } from "fs";

const rivit: string[] = readFileSync(0, "utf8").split("\n");

let total = 0;
for (const rivi of rivit) {
  const n = Number(rivi);
  if (n <= 0) break;
  total += n;
}
console.log(`Summa: ${total}`);
