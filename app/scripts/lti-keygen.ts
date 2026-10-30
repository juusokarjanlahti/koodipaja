// Prints a new RSA private key for LTI_PRIVATE_KEY (PKCS#8 PEM on one line, \n escaped).
//   npm run lti:keygen >> .env.local
import { generateKeyPairSync } from "node:crypto";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString().trim();
console.log(`LTI_PRIVATE_KEY="${pem.replace(/\n/g, "\\n")}"`);
