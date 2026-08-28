# Copyright (C) 2026 Stephen Meisenbacher

# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.

# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.

import os
import logging

logger = logging.getLogger(__name__)

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BLOCKLIST_PATH = os.path.join(CURRENT_DIR, "disposable_email_blocklist.conf")

_DISPOSABLE_DOMAINS = set()

try:
    if os.path.exists(BLOCKLIST_PATH):
        with open(BLOCKLIST_PATH, "r", encoding="utf-8") as f:
            _DISPOSABLE_DOMAINS = {
                line.strip().lower()
                for line in f
                if line.strip() and not line.startswith("#")
            }
        logger.info(f"Loaded {len(_DISPOSABLE_DOMAINS)} disposable email domains into blocklist.")
    else:
        logger.warning(f"Disposable domain blocklist not found at {BLOCKLIST_PATH}")
except Exception as e:
    logger.error(f"Failed to load disposable email blocklist: {e}")


def is_disposable_email(email: str) -> bool:
    """Returns True if the email domain matches a known disposable email provider."""
    if not email or "@" not in email:
        return False

    domain = email.split("@")[-1].strip().lower()
    return domain in _DISPOSABLE_DOMAINS