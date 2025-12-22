"""
Ad-hoc tests for the LengthVariation benchmark module.

Run from the project root:

    python -m modules.test_length_variation
"""

from modules.LengthVariation import LengthVariation


def run_case(name, original, private):
    """Utility to run a single test case and print the score."""
    lv = LengthVariation()
    print(f"\n=== {name} ===")
    print(f"- #examples: {len(original)}")
    print(f"- examples original: {original[:4]!r}")
    print(f"- examples private : {private[:4]!r}")
    score = lv.score(original, private)
    print(f"- score: {score}")


def main():
    # 1) Perfectly length-preserving (bad for variance)
    original_1 = [
        "John lives in New York.",
        "The patient was diagnosed with diabetes in 2010.",
        "Short sentence here.",
        "Another simple example sentence.",
    ]
    private_1 = [
        "Mark lives in London now.",
        "A person received a diagnosis years ago.",
        "Tiny example text.",
        "Yet another basic example line.",
    ]

    # 2) Moderate variation around the same average length (good behavior)
    original_2 = original_1
    private_2 = [
        "Someone now lives in a big city somewhere in Europe.",
        "A person was diagnosed with a chronic condition some time ago.",
        "Short.",
        "This example sentence is slightly longer than the original one.",
    ]

    # 3) Highly variable / extreme lengths (should be penalized)
    original_3 = original_1
    private_3 = [
        "Brief.",
        "This privatized version is extremely, unnecessarily, and excessively long compared to the original sentence.",
        "",
        "A very very very very very very very very very long sentence compared to the original.",
    ]

    # 4) Edge case: empty originals except one
    original_4 = ["", "", "Non-empty original."]
    private_4 = ["Short.", "Another short.", "A privatized version that is much longer than the original."]

    run_case("Case 1: length-preserving (low variance)", original_1, private_1)
    run_case("Case 2: moderate variation (desired)", original_2, private_2)
    run_case("Case 3: extreme variation", original_3, private_3)
    run_case("Case 4: edge case with empty originals", original_4, private_4)


if __name__ == "__main__":
    main()


