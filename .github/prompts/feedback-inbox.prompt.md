---
description: "Check the ProjectIQ feedback inbox and send developer replies. Use when you want to review user feedback or reply to a feedback entry."
name: "Feedback Inbox"
agent: "agent"
tools: ["execute/runInTerminal", "read/readFile"]
---

You are helping a developer manage the ProjectIQ feedback inbox (production database at https://whatiskali.dev).

## 1 — Get Credentials & Log In

Read credentials from `.projectiq-creds` in the workspace root:
```bash
cat "${WORKSPACE_FOLDER:-$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null || pwd)}/.projectiq-creds" 2>/dev/null || echo "__NOT_FOUND__"
```

Use this simpler form — resolve the workspace root first, then read:
```bash
CREDS_FILE="$(git rev-parse --show-toplevel 2>/dev/null || pwd)/.projectiq-creds"
cat "$CREDS_FILE" 2>/dev/null || echo "__NOT_FOUND__"
```

The file format is two lines:
```
email@example.com
mypassword
```

If the file doesn't exist or returns `__NOT_FOUND__`, use `vscode_askQuestions` to ask for:
- Email
- Password (warn the user it will be stored in plaintext in `.projectiq-creds`)
- Whether to save credentials for future use

If saving, write the file (use the resolved `$CREDS_FILE` path from above):
```bash
printf '%s\n%s\n' "EMAIL" "PASSWORD" > "$CREDS_FILE"
chmod 600 "$CREDS_FILE"
```

Now log in to get a fresh token every time (tokens expire, so always fetch a new one):
```bash
curl -s -X POST https://whatiskali.dev/api/auth/login \
  -d "username=EMAIL&password=PASSWORD" \
  -H "Content-Type: application/x-www-form-urlencoded"
```

Extract `access_token` from the response. If the login fails (no `access_token` in response), tell the user the credentials are wrong and stop.

## 2 — Fetch Feedback

```bash
curl -s -H "Authorization: Bearer TOKEN" https://whatiskali.dev/api/feedback/
```

Parse the JSON — entries are under `.data`.

## 3 — Display Entries

Format entries as a readable list. For each entry show:
- **#ID** — `user_name` (`type`) — `created_at` (date only) — if `done` is true show **[DONE]**
- Notes: `notes`
- Reply: if `reply` is set, show it in a blockquote with the `replied_at` date; otherwise show _(no reply yet)_

Separate entries with `---`.

If there are no entries, tell the user the inbox is empty and stop.

## 4 — Ask What to Do

Ask the user (via `vscode_askQuestions`):
- Which feedback ID to act on (number, or "exit" to stop)
- What action: **reply** or **done** (toggle done/reopen)

If they choose "exit", stop.

## 5 — Perform the Action

**If action is "reply"**, ask for the reply text, then:
```bash
curl -s -X PATCH \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"reply\": \"REPLY_TEXT\"}" \
  https://whatiskali.dev/api/feedback/ID/reply
```

**If action is "done"**, toggle the done state (marks done if open, reopens if already done):
```bash
curl -s -X PATCH \
  -H "Authorization: Bearer TOKEN" \
  https://whatiskali.dev/api/feedback/ID/done
```

Show the updated entry on success, then loop back to step 4.

## Error Handling

- **Login fails / `{"detail":"Incorrect email or password"}`**: Tell the user to check their credentials. Delete `.projectiq-creds` and ask again.
- **403 Forbidden on feedback fetch**: Their account is not admin or leader. Only admins and leaders can access the inbox.
- **`curl: (6) Could not resolve host` or connection error**: Check internet connection; https://whatiskali.dev may be down.
