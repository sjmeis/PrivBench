import numpy as np
import torch
from torch.nn import CrossEntropyLoss
import pandas as pd
from transformers import AutoTokenizer, AutoModelForCausalLM
from benchmarks.base_benchmark import BaseBenchmark
from benchmarks.benchmark_utils import with_progress_tracking

class PPL:
    def __init__(self, model_checkpoint="gpt2", max_len=256):
        #self.ppl = evaluate.load("perplexity", module_type="metric")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model_checkpoint = model_checkpoint
        self.ppl_model = AutoModelForCausalLM.from_pretrained(self.model_checkpoint).to(self.device)
        self.ppl_tokenizer = AutoTokenizer.from_pretrained(self.model_checkpoint)

        self.max_len = max_len
        if self.ppl_tokenizer.pad_token is None:
            self.ppl_tokenizer.pad_token = self.ppl_tokenizer.eos_token

    def compute_ppl(self, predictions, batch_size: int = 8, add_start_token: bool = True, max_length=256):
        # if batch_size > 1 (which generally leads to padding being required), and
        # if there is not an already assigned pad_token, assign an existing
        # special token to also be the padding token
        if self.ppl_tokenizer.pad_token is None and batch_size > 1:
            existing_special_tokens = list(self.ppl_tokenizer.special_tokens_map_extended.values())
            # check that the model already has at least one special token defined
            assert (
                len(existing_special_tokens) > 0
            ), "If batch_size > 1, model must have at least one special token to use for padding. Please use a different model or set batch_size=1."
            # assign one of the special tokens to also be the pad token
            self.ppl_tokenizer.add_special_tokens({"pad_token": existing_special_tokens[0]})

        if add_start_token and max_length:
            # leave room for <BOS> token to be added:
            assert (
                self.ppl_tokenizer.bos_token is not None
            ), "Input model must already have a BOS token if using add_start_token=True. Please use a different model, or set add_start_token=False"
            max_tokenized_len = max_length - 1
        else:
            max_tokenized_len = max_length

        encodings = self.ppl_tokenizer(
            predictions,
            add_special_tokens=False,
            padding=True,
            truncation=True if max_tokenized_len else False,
            max_length=max_tokenized_len,
            return_tensors="pt",
            return_attention_mask=True,
        ).to(self.device)

        encoded_texts = encodings["input_ids"]
        attn_masks = encodings["attention_mask"]

        # check that each input is long enough:
        if add_start_token:
            assert torch.all(torch.ge(attn_masks.sum(1), 1)), "Each input text must be at least one token long."
        else:
            assert torch.all(
                torch.ge(attn_masks.sum(1), 2)
            ), "When add_start_token=False, each input text must be at least two tokens long. Run with add_start_token=True if inputting strings of only one token, and remove all empty input strings."

        ppls = []
        loss_fct = CrossEntropyLoss(reduction="none")

        for start_index in range(0, len(encoded_texts), batch_size):
            end_index = min(start_index + batch_size, len(encoded_texts))
            encoded_batch = encoded_texts[start_index:end_index]
            attn_mask = attn_masks[start_index:end_index]

            if add_start_token:
                bos_tokens_tensor = torch.tensor([[self.ppl_tokenizer.bos_token_id]] * encoded_batch.size(dim=0)).to("cuda")
                encoded_batch = torch.cat([bos_tokens_tensor, encoded_batch], dim=1)
                attn_mask = torch.cat(
                    [torch.ones(bos_tokens_tensor.size(), dtype=torch.int64).to("cuda"), attn_mask], dim=1
                )

            labels = encoded_batch

            with torch.no_grad():
                out_logits = self.ppl_model(encoded_batch, attention_mask=attn_mask).logits

            shift_logits = out_logits[..., :-1, :].contiguous()
            shift_labels = labels[..., 1:].contiguous()
            shift_attention_mask_batch = attn_mask[..., 1:].contiguous()

            perplexity_batch = torch.exp(
                (loss_fct(shift_logits.transpose(1, 2), shift_labels) * shift_attention_mask_batch).sum(1)
                / shift_attention_mask_batch.sum(1)
            )

            ppls += perplexity_batch.tolist()

        return {"perplexities": ppls, "mean_perplexity": np.mean(ppls)}
    
    def score(self, data, internal_progress_callback=None):
        processed_data = [str(x) for x in data if pd.notna(x) and str(x).strip() != ""]

        if not processed_data:
            return 0.0

        truncated_data = [" ".join(text.split()[:self.max_len]) for text in processed_data]

        if internal_progress_callback:
            for _ in truncated_data:
                internal_progress_callback()
                    
        score = self.compute_ppl(
            predictions=processed_data, 
            max_length=self.max_len
        )["mean_perplexity"]
        
        return round(score, 3)

@with_progress_tracking
class Coherence(BaseBenchmark):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.ppl = PPL()
    
    def score(self, original, private, progress_callback=None):
        total_steps = len(original) + len(private)
        steps_completed = 0
        
        def internal_progress_handler():
            nonlocal steps_completed
            steps_completed += 1
            if progress_callback and (steps_completed % 100 == 0 or steps_completed == total_steps):
                progress_callback()
        
        o = self.ppl.score(original, internal_progress_callback=internal_progress_handler)
        
        p = self.ppl.score(private, internal_progress_callback=internal_progress_handler)
        
        ppl_score = (o / p)*100
        if ppl_score > 100:
            ppl_score = 100

        return round(ppl_score, 3)