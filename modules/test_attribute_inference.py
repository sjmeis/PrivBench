"""
Ad-hoc tests for the AttributeInference benchmark module.

Run from the project root:

    python -m modules.test_attribute_inference

For demonstration, we use a sentiment classifier as the "attacker" and interpret
sentiment (positive/negative) as an implicit attribute. In practice, you would
replace the model checkpoint with an authorship / age / gender classifier
trained on Trustpilot, Yelp, or a blog corpus.
"""

from modules.AttributeInference import AttributeInference


def run_case(name, original, private):
    ai = AttributeInference()
    print(f"\n=== {name} ===")
    print(f"- #examples: {len(original)}")
    score = ai.score(original, private)
    print(f"- attribute-inference privacy score: {score}")


def main():
    # 1) Privatization preserves sentiment/attributes -> low privacy.
    original_1 = [
        "I absolutely loved this product, it was fantastic!",
        "This restaurant was awful, I will never come back.",
        "The movie was great, I enjoyed every minute.",
    ]
    private_1 = [
        "I really liked this item, it was amazing!",
        "The place was terrible, I definitely won't return.",
        "The film was awesome, I enjoyed it a lot.",
    ]

    # 2) Privatization flips or randomizes sentiment/attributes -> higher privacy.
    private_2 = [
        "I hated this product, it was terrible.",
        "The restaurant was wonderful, I will visit again.",
        "The movie was boring and a complete waste of time.",
    ]

    run_case("Case 1: attributes largely preserved", original_1, private_1)
    run_case("Case 2: attributes often changed", original_1, private_2)


if __name__ == "__main__":
    main()


