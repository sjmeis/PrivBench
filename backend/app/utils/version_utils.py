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

def parse_version(version: str):
    """Parse version string into tuple of integers (major, minor, patch)"""
    try:
        if not version:
            return None
        parts = [int(p) for p in version.strip().split(".")]
        if len(parts) != 3:
            return None
        return tuple(parts)
    except Exception:
        return None


def get_significant_version(version_str: str):
    """
    Convert any version string to its significant version (x.y.0).
    E.g., "1.6.3" becomes "1.6.0"
    """
    parsed = parse_version(version_str)
    if not parsed:
        return version_str  # Return original if parsing fails
    return f"{parsed[0]}.{parsed[1]}.0"


def is_version_greater(new_version: str, cur_version: str) -> bool:
    """Check if new_version is greater than cur_version"""
    a = parse_version(new_version)
    b = parse_version(cur_version)
    if a is None or b is None:
        return False
    return a > b


def recommend_next_version(current: str, has_major_changes: bool = False) -> str:
    """
    Recommend the next version based on the current version and change type.

    Args:
        current: Current version string (e.g., "1.2.0")
        has_major_changes: If True, increment minor version (x.Y.0), else increment patch (x.y.Z)

    Returns:
        Recommended next version string
    """
    major, minor, patch = map(int, current.split("."))
    if has_major_changes:
        return f"{major}.{minor + 1}.0"
    return f"{major}.{minor}.{patch + 1}"
