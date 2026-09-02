import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function Setup2faPage() {
  const secret = process.env.TOTP_SECRET;

  if (!secret) {
    return (
      <Card>
        <p className="text-sm text-red-400">
          TOTP_SECRET is not set in the environment. Nothing to show here.
        </p>
      </Card>
    );
  }

  const totp = new OTPAuth.TOTP({
    issuer: "Trading Dashboard",
    label: "Dashboard",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  const qrDataUrl = await QRCode.toDataURL(totp.toString(), { margin: 1, width: 260 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Set Up Authenticator</h1>
        <p className="mt-1 text-neutral-400">
          Scan this once with Google Authenticator (or any TOTP app) to enable your login code.
        </p>
      </div>

      <Card className="max-w-md space-y-4">
        <img src={qrDataUrl} alt="2FA setup QR code" className="mx-auto rounded-lg bg-white p-3" />
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-neutral-500">
            Can&apos;t scan? Enter this key manually
          </p>
          <p className="break-all rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-sm text-violet-300">
            {secret}
          </p>
        </div>
        <p className="text-sm text-neutral-400">
          In Google Authenticator: tap + → &quot;Scan a QR code&quot; (or &quot;Enter a setup
          key&quot; and paste the key above). Once added, your login screen will ask for the
          6-digit code it shows alongside your password.
        </p>
      </Card>
    </div>
  );
}
