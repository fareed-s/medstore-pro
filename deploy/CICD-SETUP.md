# CI/CD Setup — GitHub Actions → VPS auto-deploy

After this is set up, every push to `main` will:
1. Trigger the **Deploy to VPS** workflow on GitHub.
2. The runner SSHes into the VPS and `git pull`s the new code.
3. Docker rebuilds + restarts the stack.
4. A health check confirms the API is alive before reporting success.

End-to-end time: ~2-3 min.

---

## One-time setup (10 min)

### Part 1 — Generate a deploy SSH key on the VPS

SSH into your VPS (as root or whichever user GitHub Actions will use) and run:

```bash
# Make a key pair just for GitHub Actions (no passphrase, ed25519)
ssh-keygen -t ed25519 -f ~/.ssh/github-deploy -C "github-actions@medstore" -N ""

# Add the PUBLIC key to authorized_keys so the runner can log in
cat ~/.ssh/github-deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Show the PRIVATE key — you'll paste this into GitHub in Part 2
echo "════════════════════════════════════════════════════════════════"
echo "  COPY EVERYTHING BELOW (including BEGIN/END lines) into the"
echo "  VPS_SSH_KEY secret on GitHub:"
echo "════════════════════════════════════════════════════════════════"
cat ~/.ssh/github-deploy
echo "════════════════════════════════════════════════════════════════"
```

> Keep the terminal open — you'll need that private key in Part 2.

### Part 2 — Add secrets to the GitHub repo

1. Open: `https://github.com/fareed-s/medstore-pro/settings/secrets/actions`
2. Click **"New repository secret"** for each of these:

| Secret name   | Value                                               |
|---------------|-----------------------------------------------------|
| `VPS_HOST`    | `31.97.119.223`                                    |
| `VPS_USER`    | `root`                                              |
| `VPS_SSH_KEY` | The whole private key from Part 1 (BEGIN…END lines)|
| `VPS_PORT`    | `22` *(skip if SSH is on the default port)*         |

> 🔒 The private key never appears in logs or in the repo. Only the workflow can read it.

### Part 3 — Test the workflow

```bash
# Trigger by pushing any small change
echo "" >> README.md
git add README.md && git commit -m "ci: trigger first deploy"
git push origin main
```

Then go to `https://github.com/fareed-s/medstore-pro/actions` — you should
see **"Deploy to VPS"** running. Click in to watch the live log.

You can also trigger it manually any time:
**Actions tab → Deploy to VPS → Run workflow → main → Run workflow.**

---

## What the workflow does on the VPS

```bash
cd /opt/apps/medstore
git fetch --all --prune
git reset --hard origin/main           # discard any local changes
docker compose up -d --build --remove-orphans
docker image prune -f                  # free disk from old layers
# wait until /api/health responds → success
```

Mongo data and uploaded files are NOT touched — they live in named volumes
and a bind-mount, so they survive every rebuild.

---

## Routine workflow (after setup)

You don't SSH anymore. Just:

```bash
# locally
git add .
git commit -m "feat: ..."
git push
# → GitHub Actions deploys automatically. Open the Actions tab to watch.
```

If you want to trigger a deploy without code changes (e.g. after editing
secrets), use the manual **"Run workflow"** button.

---

## Troubleshooting

**Workflow fails at "SSH and deploy" → "permission denied"**
→ Either `VPS_SSH_KEY` was pasted wrong, or the public key is not in
`~/.ssh/authorized_keys` on the VPS. Re-run Part 1 and re-paste the secret.

**Workflow fails at "API failed health check"**
→ The new code crashed at startup. Open the workflow log to see the last 50
lines of `docker compose logs api`. Common causes:
- syntax error in env file
- backend code threw on boot (mongoose schema mismatch, etc.)
- mongo container not healthy yet (timeout — bump `command_timeout` if
  your VPS is slow)

**Workflow runs but I don't see my change live**
→ Check the workflow log — does the `git log -1` line show your latest
commit hash? If yes but the site is unchanged, hard-refresh the browser
(Ctrl+Shift+R) — old assets may be cached.

**"port 22: Connection refused"**
→ Either the VPS is down, or you changed SSH to a non-standard port. Set
the `VPS_PORT` secret to the right number.

---

## Optional: rollback button

If a deploy breaks production, SSH in and pin to the previous commit:

```bash
cd /opt/apps/medstore
git log --oneline -5                # find the last good commit
git reset --hard <commit-hash>
docker compose up -d --build
```

Then fix the bug locally and push again — the next deploy will pick it up.
