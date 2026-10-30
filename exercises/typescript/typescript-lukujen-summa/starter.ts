import { readFileSync } from "fs";

const rivit: string[] = readFileSync(0, "utf8").split("\n");

// Suunnitelma:
// 1. Aloita summasta 0
// 2. Toista: lue seuraava luku
// 3. Jos luku on 0, lopeta toistaminen
// 4. Muuten lisää luku summaan
// 5. Tulosta summa
