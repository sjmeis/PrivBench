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
import pandas as pd

@with_progress_tracking
class Basis(BaseBenchmark):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        pass
    
    def score(self, original, private, progress_callback=None):
        """
        Basis check: not same texts.
        """
        passed = 0
        total = 0
        
        for x, y in zip(original, private):
            if pd.isnull(y) == True:
                passed += 1
                total += 1
                continue
                
            if x != y:
                passed += 1
            total += 1

            if progress_callback:
                progress_callback()
        
        return round((passed / total) * 100, 3)
