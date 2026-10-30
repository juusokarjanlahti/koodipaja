// Registers (or updates) an LTI 1.3 platform such as a Moodle site.
//
//   npm run lti:register -- --moodle https://moodle.example.fi --client-id ABC --deployment 1
//   npm run lti:register -- --issuer ... --client-id ... --auth-login-url ... \
//       --auth-token-url ... --jwks-url ... --deployment 1 [--deployment 2]
//
// With --moodle the endpoint URLs are Moodle's standard ones. Prints the tool URLs to
// enter on the platform side.
import { parseArgs } from "node:util";
import { closeDb, getDb, schema } from "../src/lib/db";

const { values } = parseArgs({
  options: {
    moodle: { type: "string" },
    issuer: { type: "string" },
    "client-id": { type: "string" },
    "auth-login-url": { type: "string" },
    "auth-token-url": { type: "string" },
    "jwks-url": { type: "string" },
    deployment: { type: "string", multiple: true },
  },
});

function fail(message: string): never {
  console.error(message);
  process.exit(2);
}

const moodle = values.moodle?.replace(/\/+$/, "");
const issuer = values.issuer ?? moodle;
const clientId = values["client-id"];
const authLoginUrl = values["auth-login-url"] ?? (moodle && `${moodle}/mod/lti/auth.php`);
const authTokenUrl = values["auth-token-url"] ?? (moodle && `${moodle}/mod/lti/token.php`);
const jwksUrl = values["jwks-url"] ?? (moodle && `${moodle}/mod/lti/certs.php`);
const deploymentIds = values.deployment ?? [];
if (!issuer || !clientId || !authLoginUrl || !authTokenUrl || !jwksUrl || deploymentIds.length === 0) {
  fail("usage: npm run lti:register -- --moodle URL --client-id ID --deployment ID (see the script header)");
}

async function main() {
  await getDb()
    .insert(schema.ltiPlatforms)
    .values({ issuer: issuer!, clientId: clientId!, authLoginUrl: authLoginUrl!, authTokenUrl: authTokenUrl!, jwksUrl: jwksUrl!, deploymentIds })
    .onConflictDoUpdate({
      target: [schema.ltiPlatforms.issuer, schema.ltiPlatforms.clientId],
      set: { authLoginUrl: authLoginUrl!, authTokenUrl: authTokenUrl!, jwksUrl: jwksUrl!, deploymentIds },
    });
  const app = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  console.log(`Registered ${issuer} (client ${clientId}, deployments ${deploymentIds.join(", ")}).`);
  console.log(`Tool URL:              ${app}/api/lti/launch`);
  console.log(`Initiate login URL:    ${app}/api/lti/login`);
  console.log(`Redirection URI(s):    ${app}/api/lti/launch`);
  console.log(`Public keyset URL:     ${app}/api/lti/jwks`);
  await closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
