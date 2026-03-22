"""
Email transactional service — Resend
https://resend.com/docs/send-with-python

Activated when RESEND_API_KEY env var is set.
No-op gracefully when not configured (dev / CI environment).

Emails supported:
  - welcome          : sent on user creation
  - winback_day7     : sent by cron when user inactive 7 days
  - winback_day30    : sent by cron when user inactive 30 days
  - upgrade_reminder : sent at D+14 if still free tier

Usage:
    from app.services.email_service import send_welcome_email
    await send_welcome_email(user_email="...", prenom="Sarah")
"""

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

_RESEND_API_KEY = os.getenv("RESEND_API_KEY")
_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "Digital Stylist <bonjour@digitalstylist.app>")
_FRONTEND_URL = os.getenv("FRONTEND_URL", "https://digital-stylist-mvp.vercel.app")

_warned_no_key = False


def _resend_available() -> bool:
    global _warned_no_key
    if _RESEND_API_KEY:
        return True
    if not _warned_no_key:
        logger.warning("RESEND_API_KEY non définie — emails désactivés")
        _warned_no_key = True
    return False


async def _send(to: str, subject: str, html: str) -> bool:
    """Send an email via Resend API. Returns True on success."""
    if not _resend_available():
        return False
    try:
        import resend
        resend.api_key = _RESEND_API_KEY
        resend.Emails.send({
            "from": _FROM_EMAIL,
            "to": [to],
            "subject": subject,
            "html": html,
        })
        logger.info("Email sent to %s — subject: %s", to, subject)
        return True
    except Exception as e:
        logger.error("Email send failed to %s: %s", to, e)
        return False


def _base_template(content: str) -> str:
    return f"""
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Digital Stylist</title></head>
<body style="margin:0;padding:0;background-color:#030712;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#030712;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <!-- Header -->
        <tr><td style="padding-bottom:32px;text-align:center;">
          <span style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
            DIGITAL<span style="background:linear-gradient(90deg,#a855f7,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">STYLIST</span>
          </span>
        </td></tr>
        <!-- Content -->
        <tr><td style="background-color:#111827;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px;">
          {content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="color:#4b5563;font-size:12px;margin:0;">
            Digital Stylist · Ton styliste IA personnel<br>
            <a href="{_FRONTEND_URL}" style="color:#7c3aed;text-decoration:none;">Ouvrir l'app</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""


async def send_welcome_email(to: str, prenom: str) -> bool:
    """Welcome email sent immediately after user creation."""
    content = f"""
      <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0 0 8px;">
        Bienvenue, {prenom} ! 👋
      </h1>
      <p style="color:#9ca3af;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Ton styliste IA personnel est prêt. Commence par ajouter tes premiers vêtements
        pour recevoir des suggestions personnalisées chaque matin.
      </p>
      <div style="background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.2);border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="color:#c084fc;font-size:13px;font-weight:600;margin:0 0 12px;">Tes 3 premières étapes :</p>
        <p style="color:#d1d5db;font-size:14px;margin:0 0 8px;">📸 &nbsp;Prends en photo tes vêtements préférés</p>
        <p style="color:#d1d5db;font-size:14px;margin:0 0 8px;">✨ &nbsp;Reçois ta première suggestion de tenue</p>
        <p style="color:#d1d5db;font-size:14px;margin:0;">🔔 &nbsp;Active les notifications pour ton look du matin</p>
      </div>
      <a href="{_FRONTEND_URL}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#db2777);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:12px;">
        Découvrir mon styliste →
      </a>"""
    return await _send(to, f"Bienvenue {prenom} — ton styliste IA t'attend ✨", _base_template(content))


async def send_winback_day7(to: str, prenom: str, ville: Optional[str] = None) -> bool:
    """Winback email at D+7 inactivity."""
    ville_txt = f" à {ville}" if ville else ""
    content = f"""
      <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0 0 8px;">
        {prenom}, tu nous manques ! 👀
      </h1>
      <p style="color:#9ca3af;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Ça fait une semaine que tu n'es pas revenu(e). La météo{ville_txt} a changé
        — et ton styliste IA a de nouvelles idées de tenues pour toi.
      </p>
      <div style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="color:#fbbf24;font-size:14px;font-weight:600;margin:0;">
          🎁 Reviens aujourd'hui et reçois 7 suggestions offertes
        </p>
      </div>
      <a href="{_FRONTEND_URL}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#db2777);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:12px;">
        Voir mon look du jour →
      </a>"""
    return await _send(to, f"{prenom}, ton look du moment t'attend 👀", _base_template(content))


async def send_upgrade_reminder(to: str, prenom: str) -> bool:
    """Upsell email at D+14 for free-tier users."""
    content = f"""
      <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0 0 8px;">
        {prenom}, tu rates le meilleur 💎
      </h1>
      <p style="color:#9ca3af;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Pendant que tu utilises Digital Stylist gratuitement, les membres Premium
        reçoivent des suggestions illimitées, le chat stylist sans limite, et
        les analyses avancées de leur garde-robe.
      </p>
      <div style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="color:#fbbf24;font-size:13px;font-weight:600;margin:0 0 12px;">Premium, c'est :</p>
        <p style="color:#d1d5db;font-size:14px;margin:0 0 8px;">✅ &nbsp;Suggestions illimitées chaque jour</p>
        <p style="color:#d1d5db;font-size:14px;margin:0 0 8px;">✅ &nbsp;Chat styliste IA sans limite</p>
        <p style="color:#d1d5db;font-size:14px;margin:0;">✅ &nbsp;Garde-robe illimitée (vs 20 pièces)</p>
      </div>
      <a href="{_FRONTEND_URL}" style="display:inline-block;background:linear-gradient(135deg,#d97706,#f59e0b);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:12px;">
        Passer à Premium — €0.10/jour →
      </a>"""
    return await _send(to, f"{prenom}, suggestions illimitées à €0.10/jour 💎", _base_template(content))
