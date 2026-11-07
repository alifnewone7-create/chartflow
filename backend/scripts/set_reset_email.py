"""Push the branded password-reset email template to Firebase. Usage: python set_reset_email.py https://your-site.com"""
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from google.auth.transport.requests import AuthorizedSession
from google.oauth2 import service_account

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

site = sys.argv[1].rstrip("/")
info = json.loads(os.environ["FIREBASE_SERVICE_ACCOUNT"])
creds = service_account.Credentials.from_service_account_info(info, scopes=["https://www.googleapis.com/auth/cloud-platform"])
session = AuthorizedSession(creds)

body = {
    "notification": {
        "sendEmail": {
            "callbackUri": f"{site}/auth-action",
            "resetPasswordTemplate": {
                "senderLocalPart": "noreply",
                "senderDisplayName": "ChartFlow Ai",
                "subject": "Reset your ChartFlow Ai password",
                "body": (ROOT / "email_templates" / "reset_password.html").read_text(),
                "bodyFormat": "HTML",
                "replyTo": "noreply",
            },
        }
    }
}
mask = "notification.sendEmail.callbackUri,notification.sendEmail.resetPasswordTemplate"
url = f"https://identitytoolkit.googleapis.com/admin/v2/projects/{info['project_id']}/config?updateMask={mask}"
res = session.patch(url, json=body)
print(res.status_code)
print(res.text[:800]); res.raise_for_status()
print(json.dumps(res.json()["notification"]["sendEmail"]["resetPasswordTemplate"]["subject"]))
