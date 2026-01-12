"""
Ad-hoc tests for the CarliniExposure benchmark module.

Run from the project root:

    python -m modules.test_carlini_exposure
"""

from modules.CarliniExposure import CarliniExposure


def run_case(name, secrets, candidates_list):
    """Utility to run a single test case and print the exposure score."""
    ce = CarliniExposure()
    print(f"\n=== {name} ===")
    print(f"- #examples: {len(secrets)}")
    score = ce.score(secrets, candidates_list)
    print(f"- exposure score: {score}")


def main():
    # 1) Strong memorization: secret always ranked 1st
    secrets_1 = [
        "my very secret string",
        "another hidden phrase",
        "third secret",
    ]
    candidates_1 = [
        ["my very secret string", "decoy1", "decoy2", "decoy3"],
        ["another hidden phrase", "noise1", "noise2", "noise3"],
        ["third secret", "something else", "dummy", "other"],
    ]

    # 2) Moderate memorization: secret usually in the top 5 but not always 1st
    secrets_2 = secrets_1
    candidates_2 = [
        ["decoy1", "my very secret string", "decoy2", "decoy3"],
        ["noise1", "another hidden phrase", "noise2", "noise3"],
        ["something else", "dummy", "third secret", "other"],
    ]

    # 3) Weak memorization: secret rarely appears or is low-ranked
    secrets_3 = secrets_1
    candidates_3 = [
        ["decoy1", "decoy2", "decoy3", "decoy4"],
        ["noise1", "noise2", "another hidden phrase"],  # appears, but as the last
        ["other", "dummy", "something else", "third secret"],  # appears, but as the last
    ]

    run_case("Case 1: strong memorization (high exposure expected)", secrets_1, candidates_1)
    run_case("Case 2: moderate memorization", secrets_2, candidates_2)
    run_case("Case 3: weak memorization", secrets_3, candidates_3)


if __name__ == "__main__":
    main()


