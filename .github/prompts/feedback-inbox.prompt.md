---
description: "Check the ProjectIQ feedback inbox and send developer replies. Use when you want to review user feedback or reply to a feedback entry."
name: "Feedback Inbox"
agent: "agent"
tools: ["execute/runInTerminal", "read/readFile"]
---

You are helping a developer manage the ProjectIQ feedback inbox.

## 1 — Get Credentials & Log In

Read credentials from `.projectiq-creds` in the workspace root:
```bash
cat /Users/labanlaro/Projects/project-iq/.projectiq-creds 2>/dev/null || echo "__NOT_FOUND__"
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

If saving, write the file:
```bash
printf '%s\n%s\n' "EMAIL" "PASSWORD" > /Users/labanlaro/Projects/project-iq/.projectiq-creds
chmod 600 /Users/labanlaro/Projects/project-iq/.projectiq-creds
```

Now log in to get a fresh token every time (tokens expire, so always fetch a new one):
```bash
curl -s -X POST http://localhost/api/auth/login \
  -d "username=EMAIL&password=PASSWORD" \
  -H "Content-Type: application/x-www-form-urlencoded"
```

Extract `access_token` from the response. If the login fails (no `access_token` in response), tell the user the credentials are wrong and stop.

## 2 — Fetch Feedback

```bash
curl -s -H "Authorization: Bearer TOKEN" http://localhost/api/feedback/
```

Parse the JSON — entries are under `.data`.

## 3 — Display Entries

Format entries as a readable list. For each entry show:
- **#ID** — `user_name` (`type`) — `created_at` (date only)
- Notes: `notes`
- Reply: if `reply` is set, show it in a blockquote with the `replied_at` date; otherwise show _(no reply yet)_

Separate entries with `---`.

If there are no entries, tell the user the inbox is empty and stop.

## 4 — Ask What to Do

Ask the user (via `vscode_askQuestions`):
- Which feedback ID they want to reply to (number, or "done" to exit)
- What their reply should be

If they choose "done", stop.

## 5 — Send the Reply

```bash
curl -s -X PATCH \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"reply\": \"REPLY_TEXT\"}" \
  http://localhost/api/feedback/ID/reply
```

Show the updated entry on success, then loop back to step 4.

## Error Handling

- **Login fails / `{"detail":"Incorrect email or password"}`**: Tell the user to check their credentials. Delete `.projectiq-creds` and ask again.
- **403 Forbidden on feedback fetch**: Their account is not admin or leader.
- **`curl: (7) Failed to connect`**: Backend is not running — `docker compose up -d backend`.
