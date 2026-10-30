// Hyväksytään: kirjainkoko ja kaksoispiste poikkeavat, summa on oikein.
import { readFileSync } from "fs";

const rivit: string[] = readFileSync(0, "utf8").split("\n");

let total = 0;
for (const rivi of rivit) {
  const n = Number(rivi);
  if (n === 0) break;
  total += n;
}
console.log("summa", total);
