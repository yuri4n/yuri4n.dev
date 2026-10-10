# Security policy

This policy applies to the `yuri4n/yuri4n.dev` repository: the Nuxt layers,
the ESLint preset, the reusable workflows and the Renovate preset.

## Report a vulnerability

Do not open a public issue, discussion or pull request for a security problem.

1. Open the **Security** tab of this repository.
2. Click **Report a vulnerability**
   (<https://github.com/yuri4n/yuri4n.dev/security/advisories/new>). GitHub
   keeps the report private between you and the maintainer.

If the button is not there, private vulnerability reporting is off. Then
contact the maintainer through a contact option on the
[@yuri4n profile](https://github.com/yuri4n) and ask for a private channel.
Send no details until you have one.

If you find a secret (a token, a key or a password) in this repository or in
its history, report it in the same way. Do not use it.

## What to include

- The release tag or the commit.
- The package or workflow, and what an attacker can do (the impact).
- The steps to reproduce, or a proof of concept that does no harm.
- A fix idea, if you have one.

Test only against your own copy. Do not access data that is not yours, and do
not slow down or break a running service.

## Supported versions

| Version       | Supported                    |
| ------------- | ---------------------------- |
| Latest tag    | Yes                          |
| `main` branch | Yes                          |
| Older tags    | No: update to the latest tag |

## What happens next

One person maintains this repository, on a best-effort basis. There are no
promised times for an answer or a fix. When the maintainer can reproduce the
problem, the fix goes into `main` and into a new patch tag. You get credit in
the release notes if you want it.
