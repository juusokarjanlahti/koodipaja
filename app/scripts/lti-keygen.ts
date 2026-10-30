// Prints a new RSA private key for LTI_PRIVATE_KEY (PKCS#8 PEM on one line, \n escaped).
//   npm run lti:keygen >> .env.local          # LTI_PRIVATE_KEY="..."
//   npm run --silent lti:keygen -- --value    # the value only (CI secrets, GITHUB_ENV)
import { generateKeyPairSync } from "node:crypto";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const value = privateKey.export({ type: "pkcs8", format: "pem" }).toString().trim().replace(/\n/g, "\\n");
console.log(process.argv.includes("--value") ? value : `LTI_PRIVATE_KEY="${value}"`);
