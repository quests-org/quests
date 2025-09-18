import { execFileSync } from "node:child_process";

const SIGNTOOL = process.env.SIGNTOOL_PATH || "signtool.exe";

const TIMESTAMP =
  process.env.WIN_TIMESTAMP_URL ||
  "http://timestamp.globalsign.com/tsa/r6advanced1";
// Full key **version** resource ID:
// projects/…/locations/…/keyRings/…/cryptoKeys/…/cryptoKeyVersions/1
const KCV = process.env.WIN_GCP_KMS_KEY_VERSION;
// Path to your EV cert chain (PEM or DER)
const CERTFILE = process.env.WIN_CERT_PATH;

// eslint-disable-next-line unicorn/no-anonymous-default-export, @typescript-eslint/require-await
export default async function (cfg) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (!cfg?.path) {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const file = String(cfg.path);

  const args = [
    "sign",
    "/v",
    "/debug",
    "/fd",
    "sha256",
    "/tr",
    TIMESTAMP,
    "/td",
    "sha256",
    "/f",
    CERTFILE,
    "/csp",
    "Google Cloud KMS Provider",
    "/kc",
    KCV,
    file,
  ];

  execFileSync(SIGNTOOL, args, { stdio: "inherit" });
}
