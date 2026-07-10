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

import pandas as pd
import spacy
from collections import Counter
from tqdm.auto import tqdm
from benchmarks.base_benchmark import BaseBenchmark
from benchmarks.benchmark_utils import with_progress_tracking


@with_progress_tracking
class NERpriv(BaseBenchmark):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.nlp = spacy.load("en_core_web_sm")
    
    def score(self, original, private, progress_callback=None):
        """
        Calculate NER privacy score with progress tracking.
        """
        removed = 0
        total = 0
        
        for x, y in zip(original, private):
            o_doc = self.nlp(x)
            
            if pd.isnull(y):
                total += len([x.text for x in o_doc.ents])
                if progress_callback:
                    progress_callback()
                continue
                
            p_doc = self.nlp(y)
            counts = Counter()
            
            for ent in o_doc.ents:
                counts[ent.text] += 1
                
            priv_ents = set()
            for ent in p_doc.ents:
                priv_ents.add(ent.text)
                
            for ent in counts:
                if ent not in priv_ents and ent.lower() not in priv_ents:
                    removed += counts[ent]
                total += counts[ent]
                
            if progress_callback:
                progress_callback()
        
        return round((removed / total) * 100) if total > 0 else 0.0
