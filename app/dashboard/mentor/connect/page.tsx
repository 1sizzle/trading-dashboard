import { Card } from "@/components/ui/Card";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui/Field";
import { decide } from "./actions";
import { parseAuthorizeRequest } from "./request";

export const dynamic = "force-dynamic";

// OAuth consent screen for the Claude mentor connector. It sits under /dashboard,
// so the proxy makes you log in (password + 2FA) before you ever see it.
export default async function ConnectMentorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  if (params.error) {
    return <ConnectError message={params.error} />;
  }
  const parsed = await parseAuthorizeRequest((key) => params[key]);
  if (!parsed.ok) {
    return <ConnectError message={parsed.error} />;
  }

  const forwarded = [
    "response_type",
    "client_id",
    "redirect_uri",
    "state",
    "code_challenge",
    "code_challenge_method",
    "resource",
    "scope",
  ];

  return (
    <div className="mx-auto max-w-md space-y-6 pt-6">
      <Card accent>
        <h1 className="text-xl font-semibold">Connect Claude as your mentor?</h1>
        <p className="mt-2 text-sm text-neutral-400">
          <span className="text-neutral-200">{parsed.request.client.name}</span> is asking to connect to this
          dashboard. It will be able to:
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-neutral-300">
          <li>Read your trade journal, screenshots, playbook, rules, reviews, news and mentor calls</li>
          <li>Pull NQ / ES price levels</li>
          <li>Save its premarket plans, reviews and your pattern notes here</li>
        </ul>
        <p className="mt-3 text-sm text-neutral-500">
          It can&apos;t change or delete your trades, accounts or finances. Remove the connector in Claude to
          disconnect.
        </p>
        <form action={decide} className="mt-5 flex gap-3">
          {forwarded.map((key) =>
            params[key] ? <input key={key} type="hidden" name={key} value={params[key]} /> : null,
          )}
          <button type="submit" name="decision" value="allow" className={`flex-1 ${primaryButtonClass}`}>
            Allow
          </button>
          <button type="submit" name="decision" value="deny" className={`flex-1 ${secondaryButtonClass}`}>
            Deny
          </button>
        </form>
      </Card>
    </div>
  );
}

function ConnectError({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-md pt-6">
      <Card>
        <h1 className="text-lg font-semibold">Can&apos;t connect</h1>
        <p className="mt-2 text-sm text-neutral-400">{message}</p>
      </Card>
    </div>
  );
}
