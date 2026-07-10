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

def with_progress_tracking(benchmark_class):
    """Decorator to add progress tracking to benchmark modules"""
    original_score = benchmark_class.score

    def score_with_progress(self, original_df, private_df, progress_callback=None):
        total_rows = len(original_df)
        rows_processed = 0

        def wrapped_callback(processed=None):
            nonlocal rows_processed
            rows_processed += 1
            if progress_callback:
                # Call the original callback with current progress
                progress_callback(rows_processed)

        # Call original score method but add progress tracking
        result = original_score(self, original_df, private_df, wrapped_callback)
        return result

    benchmark_class.score = score_with_progress
    return benchmark_class