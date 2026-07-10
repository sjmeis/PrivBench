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

from benchmarks.base_benchmark import BaseBenchmark
from benchmarks.benchmark_utils import with_progress_tracking
import random

@with_progress_tracking
class Bonus(BaseBenchmark):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        pass
    
    def score(self, original, private, progress_callback=None):
        """
        Bonus score for user!
        """
        
        random_bonus = 0
        total = 0

        for x, y in zip(original, private):
            random_bonus += random.random()
            total += 1
                
            if progress_callback:
                progress_callback()
        
        score = 99 + (random_bonus / total)
        return round(score, 3)
