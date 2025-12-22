"""
Ad-hoc tests for the LengthRobustness meta-benchmark module.

Run from the project root:

    python -m modules.test_length_robustness
"""

from modules.LengthRobustness import LengthRobustness


def run_case(name, original, private):
    """Utility to run a single test case and print the robustness score."""
    lr = LengthRobustness()
    print(f"\n=== {name} ===")
    print(f"- #examples: {len(original)}")
    score = lr.score(original, private)
    print(f"- length robustness score: {score}")


def main():
    # Bins (by default) are:
    #   short : 0–19 words
    #   medium: 20–99 words
    #   long  : 100+ words

    # 1) Similar behavior across lengths: ExactMatch uniformly good.
    short_orig = ["short text.", "tiny doc."]
    short_priv = ["short text.", "tiny doc."]  # exact matches

    medium_orig = [
        "This is a medium-length document used for testing the robustness metric.",
        "Another somewhat longer sentence to land in the medium bucket of lengths.",
    ]
    medium_priv = [
        "This is a medium-length document used for testing the robustness metric.",
        "Another somewhat longer sentence to land in the medium bucket of lengths.",
    ]

    long_orig = [
        " ".join(["long"] * 120),
        " ".join(["another", "long"] * 80),
    ]
    long_priv = long_orig[:]  # perfect matches for long as well

    original_1 = short_orig + medium_orig + long_orig
    private_1 = short_priv + medium_priv + long_priv

    # 2) Good on short, poor on long: robustness should drop.
    short_priv_bad = ["short text.", "tiny doc."]  # still good
    medium_priv_bad = [
        "completely different medium text",
        "something unrelated to the original sentence",
    ]
    long_priv_bad = [
        " ".join(["noise"] * 120),
        " ".join(["noise"] * 160),
    ]

    original_2 = short_orig + medium_orig + long_orig
    private_2 = short_priv_bad + medium_priv_bad + long_priv_bad

    run_case("Case 1: similar performance across lengths (robust)", original_1, private_1)
    run_case("Case 2: performance degrades on longer docs", original_2, private_2)


if __name__ == "__main__":
    main()