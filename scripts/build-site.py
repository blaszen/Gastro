"""Builds the public website (hosting/) from the in-app legal text.
Run from the repo root:  python scripts/build-site.py
"""
import os, re

SRC = "app/(drawer)/legal.tsx"
EMAIL = "blaszen.dev@gmail.com"
src = open(SRC, encoding="utf-8").read()


def sections(name):
    block = src[src.index(f"const {name}"):]
    block = block[: block.index("];")]
    return [
        (h, p.replace("${SUPPORT_EMAIL}", f'<a href="mailto:{EMAIL}">{EMAIL}</a>'))
        for h, p in re.findall(r'h: "([^"]+)",\s*p: [`"](.+?)[`"],\n', block, re.S)
    ]


updated = re.search(r'const UPDATED = "([^"]+)"', src).group(1)
CSS = """*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#0f1115;color:#e4e4e7;line-height:1.6}
main{max-width:720px;margin:0 auto;padding:48px 24px 80px}a{color:#f59e0b}header{display:flex;align-items:center;gap:12px;margin-bottom:32px}
.logo{width:44px;height:44px;border-radius:12px;background:#f59e0b;color:#0f1115;font-weight:900;display:flex;align-items:center;justify-content:center;font-size:22px}
.brand{font-weight:900;letter-spacing:3px;color:#fff}h1{color:#fff;font-size:32px;margin:0 0 4px}.muted{color:#a1a1aa}h2{color:#fff;font-size:18px;margin:28px 0 6px}
nav{margin-top:48px;padding-top:20px;border-top:1px solid #27272a;display:flex;gap:20px;flex-wrap:wrap}.card{background:#181b20;border:1px solid #27272a;border-radius:16px;padding:20px;margin-top:20px}"""


def page(title, body):
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} · GASTRO</title><style>{CSS}</style></head>
<body><main><header><div class="logo">G</div><div class="brand">GASTRO</div></header>
{body}
<nav><a href="/">Home</a><a href="/privacy">Privacy Policy</a><a href="/terms">Terms of Use</a><a href="/support">Support</a></nav>
</main></body></html>
"""


def legal(title, name):
    body = f"<h1>{title}</h1><p class=muted>Last updated {updated}</p>" + "".join(
        f"<h2>{h}</h2><p>{p}</p>" for h, p in sections(name)
    )
    return page(title, body)


os.makedirs("hosting", exist_ok=True)
pages = {
    "privacy.html": legal("Privacy Policy", "PRIVACY"),
    "terms.html": legal("Terms of Use", "TERMS"),
    "support.html": page("Support", f"""<h1>Support</h1><p class=muted>We're here to help.</p>
<div class=card><h2 style="margin-top:0">Contact us</h2><p>Email <a href="mailto:{EMAIL}">{EMAIL}</a> and we'll reply within 2 business days.</p></div>
<h2>Forgot your password?</h2><p>On the sign-in screen tap <b>Forgot password?</b> and we'll email you a reset link.</p>
<h2>Report content or a user</h2><p>Open the recipe and tap the flag icon to report it, or open the chef's profile and tap block. We review reports within 24 hours.</p>
<h2>Delete your account</h2><p>In the app go to <b>Settings → Delete Account</b>. This permanently removes your profile, recipes, lists, favorites, friends, lesson progress and photos.</p>
<h2>Recipe search or AI not working?</h2><p>Check your connection and try again in a minute. AI recipes are limited per day; if it keeps failing, email us.</p>"""),
    "index.html": page("Cook, share and learn", f"""<h1>Cook, share and learn.</h1>
<p class=muted style="font-size:18px">GASTRO is a home for cooks: discover recipes, generate new ones with AI, publish your own, build your kitchen crew, chat with friends and level up from basics to chef with the built-in Masterclass.</p>
<div class=card><h2 style="margin-top:0">Coming soon to the App Store</h2><p>Questions? <a href="mailto:{EMAIL}">{EMAIL}</a></p></div>"""),
    "404.html": page("Not found", "<h1>Page not found</h1><p class=muted>Try one of the links below.</p>"),
}
for name, html in pages.items():
    with open(os.path.join("hosting", name), "w", encoding="utf-8") as f:
        f.write(html)
print("Built", ", ".join(pages), "| privacy sections:", len(sections("PRIVACY")), "| terms sections:", len(sections("TERMS")))
