"""
Run RUPTA-style LLM-based text anonymization on the benchmark datasets.

RUPTA (Robust Utility-Preserving Text Anonymization) uses an LLM to:
  1. Detect named entities and PII in text (→ structured JSON)
  2. Rewrite the text, replacing identified entities with anonymized alternatives

We use the "simple" strategy (single detect→rewrite pass, no iterative refinement)
with a local open-source model served via vLLM for efficient batched inference.

Original paper: https://github.com/UKPLab/acl2025-rupta

Usage (on server, inside ~/rupta_venv):
    # Process all datasets sequentially:
    python3 ~/run_rupta.py

    # Process a single dataset:
    python3 ~/run_rupta.py --dataset imdb.csv

    # Process a row range:
    python3 ~/run_rupta.py --dataset imdb.csv --start 0 --end 500 --suffix _chunk0

Prerequisites:
    - Virtual environment with vLLM and nltk:
      python3 -m venv ~/rupta_venv
      source ~/rupta_venv/bin/activate
      pip install vllm nltk
    - Model auto-downloads from HuggingFace on first run (~4.5 GB)
"""

import argparse
import csv
import json
import re
import sys
import time
from pathlib import Path

INPUT_DIR = Path.home()
OUTPUT_DIR = Path.home() / "rupta_output"

MODEL_NAME = "Qwen/Qwen2.5-7B-Instruct-GPTQ-Int4"

DATASETS = [
    "glue.csv",
    "imdb.csv",
    "tab.csv",
    "wikitext.csv",
    "yelp.csv",
    "pubmedqa.csv",
    "reddit.csv",
]

# ── Prompts (adapted from RUPTA's people_prompt.py for generic text) ─────

DETECTION_SYSTEM = (
    "You are a privacy-focused NLP assistant. Your task is to identify all "
    "personally identifiable information (PII) and named entities in text. "
    "Always respond with valid JSON only."
)

DETECTION_USER = (
    "Identify all named entities and personally identifiable information (PII) "
    "in the following text. Include: person names, specific locations (cities, "
    "addresses, countries), organizations, dates, ages, phone numbers, email "
    "addresses, and any other identifying information.\n\n"
    'Return ONLY a JSON object in this exact format:\n'
    '{{"entities": [{{"text": "entity_text", "type": "entity_type"}}]}}\n'
    'If no entities are found, return: {{"entities": []}}\n\n'
    'Text: "{text}"'
)

REWRITING_SYSTEM = (
    "You are a text anonymization assistant. Your task is to rewrite text to "
    "remove personally identifiable information while preserving the original "
    "meaning, style, and approximate length. Return ONLY the rewritten text."
)

REWRITING_USER_WITH_ENTITIES = (
    "Rewrite the following text to anonymize the identified entities while "
    "preserving the original meaning, style, and approximate length. Replace "
    "person names with fictional alternatives, specific locations with general "
    "regions, specific dates with approximate periods, organizations with "
    "generic alternatives, etc.\n"
    "Return ONLY the rewritten text, nothing else.\n\n"
    'Original text: "{text}"\n'
    "Entities to anonymize: {entities_json}\n\n"
    "Anonymized text:"
)

REWRITING_USER_NO_ENTITIES = (
    "The following text contains no personally identifiable information. "
    "Return it unchanged.\n\n"
    'Text: "{text}"\n\n'
    "Text:"
)


def clean_text(text: str) -> str:
    """Strip HTML tags and normalise whitespace (fixes IMDB <br /> etc.)."""
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def parse_entities(response_text: str):
    """Parse entity list from LLM response. Returns list of dicts or []."""
    # Try direct JSON parse
    text = response_text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)

    try:
        obj = json.loads(text)
        if isinstance(obj, dict) and "entities" in obj:
            return obj["entities"]
        if isinstance(obj, list):
            return obj
        return []
    except json.JSONDecodeError:
        pass

    # Fallback: extract JSON object via regex
    m = re.search(r'\{[^{}]*"entities"\s*:\s*\[.*?\]\s*\}', text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group())["entities"]
        except (json.JSONDecodeError, KeyError):
            pass

    return []


def build_chat_prompt(tokenizer, system: str, user: str) -> str:
    """Format a system+user message pair using the model's chat template."""
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]
    return tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )


def process_dataset(filename, llm, tokenizer, sampling_params,
                    start_row=0, end_row=None, suffix=""):
    input_path = INPUT_DIR / filename
    out_name = filename.replace(".csv", f"_rupta{suffix}.csv")
    output_path = OUTPUT_DIR / out_name
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with open(input_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        all_rows = list(reader)

    # Select row range
    if end_row is None:
        end_row = len(all_rows)
    rows = all_rows[start_row:end_row]
    total = len(rows)

    # Skip if already completed
    if output_path.exists():
        with open(output_path, newline="", encoding="utf-8") as f:
            output_rows = sum(1 for _ in f) - 1
        if output_rows >= total:
            print(f"\nSkipping {out_name} (already complete: {output_rows} rows)",
                  flush=True)
            return

    print(f"\nProcessing {out_name} (rows {start_row}-{end_row-1}, {total} rows)...",
          flush=True)

    # ── Step 1: Clean texts ──────────────────────────────────────────────
    texts = [clean_text(row.get("text", "")) for row in rows]

    # ── Step 2: Batch detection ──────────────────────────────────────────
    print("  Step 1/2: Detecting entities (batch)...", flush=True)
    detect_prompts = [
        build_chat_prompt(
            tokenizer, DETECTION_SYSTEM,
            DETECTION_USER.format(text=t.replace('"', '\\"'))
        )
        for t in texts
    ]

    t0 = time.time()
    detect_outputs = llm.generate(detect_prompts, sampling_params)
    detect_time = time.time() - t0
    print(f"    Detection done in {detect_time:.1f}s", flush=True)

    # Parse entities
    entity_lists = []
    json_errors = 0
    for i, output in enumerate(detect_outputs):
        resp = output.outputs[0].text
        entities = parse_entities(resp)
        if resp.strip() and not entities and '"entities"' not in resp:
            json_errors += 1
        entity_lists.append(entities)

    print(f"    Entities parsed ({json_errors} JSON parse issues)", flush=True)

    # ── Step 3: Batch rewriting ──────────────────────────────────────────
    print("  Step 2/2: Rewriting texts (batch)...", flush=True)
    rewrite_prompts = []
    for t, entities in zip(texts, entity_lists):
        escaped_text = t.replace('"', '\\"')
        if entities:
            user_msg = REWRITING_USER_WITH_ENTITIES.format(
                text=escaped_text,
                entities_json=json.dumps(entities, ensure_ascii=False),
            )
        else:
            user_msg = REWRITING_USER_NO_ENTITIES.format(text=escaped_text)
        rewrite_prompts.append(
            build_chat_prompt(tokenizer, REWRITING_SYSTEM, user_msg)
        )

    t0 = time.time()
    rewrite_outputs = llm.generate(rewrite_prompts, sampling_params)
    rewrite_time = time.time() - t0
    print(f"    Rewriting done in {rewrite_time:.1f}s", flush=True)

    # ── Step 4: Extract results and write CSV ────────────────────────────
    errors = 0
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "text"])
        writer.writeheader()

        for i, row in enumerate(rows):
            try:
                privatized = rewrite_outputs[i].outputs[0].text.strip()
                # Strip surrounding quotes if the model wrapped the output
                if (privatized.startswith('"') and privatized.endswith('"')
                        and len(privatized) > 1):
                    privatized = privatized[1:-1]
            except Exception as e:
                global_row = start_row + i
                print(f"  [WARN] Row {global_row} extraction failed: "
                      f"{str(e)[:120]}", file=sys.stderr, flush=True)
                errors += 1
                privatized = ""

            writer.writerow({"id": row["id"], "text": privatized})

    empty_count = sum(
        1 for o in rewrite_outputs if not o.outputs[0].text.strip()
    )
    print(f"  Saved to {output_path} "
          f"({errors} errors, {empty_count} empty, {json_errors} JSON issues)",
          flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Run RUPTA-style LLM-based text anonymization"
    )
    parser.add_argument("--dataset", type=str, default=None,
                        help="Single dataset filename (e.g. imdb.csv)")
    parser.add_argument("--start", type=int, default=0,
                        help="Start row index (inclusive, default 0)")
    parser.add_argument("--end", type=int, default=None,
                        help="End row index (exclusive, default all)")
    parser.add_argument("--suffix", type=str, default="",
                        help="Output filename suffix (e.g. _chunk0)")
    parser.add_argument("--model", type=str, default=MODEL_NAME,
                        help=f"HuggingFace model name (default: {MODEL_NAME})")
    parser.add_argument("--max-model-len", type=int, default=4096,
                        help="Maximum context length for vLLM (default: 4096)")
    args = parser.parse_args()

    from vllm import LLM, SamplingParams

    print(f"Loading model {args.model} via vLLM...", flush=True)
    llm = LLM(
        model=args.model,
        quantization="gptq",
        max_model_len=args.max_model_len,
        gpu_memory_utilization=0.90,
        trust_remote_code=True,
    )
    tokenizer = llm.get_tokenizer()
    print("Model loaded.", flush=True)

    sampling_params = SamplingParams(
        temperature=0.0,
        max_tokens=1024,
        stop=["<|im_end|>", "<|endoftext|>"],
    )

    start = time.time()

    if args.dataset:
        process_dataset(args.dataset, llm, tokenizer, sampling_params,
                        start_row=args.start, end_row=args.end,
                        suffix=args.suffix)
    else:
        for dataset in DATASETS:
            process_dataset(dataset, llm, tokenizer, sampling_params)

    elapsed = time.time() - start
    print(f"\nDone in {elapsed / 60:.1f} min. Output in ~/rupta_output/")
