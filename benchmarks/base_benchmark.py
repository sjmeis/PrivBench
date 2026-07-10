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

from abc import ABC, abstractmethod

class BaseBenchmark(ABC):
    def __init__(self, **kwargs):
        pass

    @abstractmethod
    def score(self, original, private, progress_callback=None):
        """
        Abstract method to compute the benchmark score.
        Args:
            original: Original dataset
            private: Privatized dataset
            progress_callback: Optional callback for progress tracking
        """
        pass

    def _update_progress(self, progress_callback, current, total):
        """Helper method to handle progress updates"""
        if progress_callback:
            progress_callback(current)