import os
import sys
import time
import torch
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments
)
from trl import SFTTrainer, SFTConfig
from peft import LoraConfig, get_peft_model, PeftModel

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

BASE_MODEL = "Qwen/Qwen2.5-0.5B-Instruct"
TRAIN_FILE = r"d:\01.AntiGravity\Space_consult_assist\scripts\dataset_balanced_train.jsonl"
TEST_FILE = r"d:\01.AntiGravity\Space_consult_assist\scripts\dataset_balanced_test.jsonl"
OUTPUT_DIR = r"d:\01.AntiGravity\Space_consult_assist\scripts\output_balanced_slm"
MERGED_DIR = r"d:\01.AntiGravity\Space_consult_assist\scripts\merged_qwen_0.5b_v2"
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(MERGED_DIR, exist_ok=True)

print("==================================================================")
print("  🚀 [트랙 2] Qwen2.5-0.5B 7,500건 균형 실데이터 LoRA 재학습 시작")
print("==================================================================")

# 1. 토크나이저 및 베이스 모델 로드
print(f"📦 베이스 모델 로딩: {BASE_MODEL} ...")
tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, use_fast=True)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL,
    dtype=torch.bfloat16,
    device_map="cuda"
)

# 2. LoRA 설정
print("🔧 LoRA 어댑터 설정 (r=16, alpha=32, all-linear)...")
lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM"
)
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()

# 3. 데이터셋 로드
print("📂 균형 데이터셋 로딩 중...")
dataset = load_dataset(
    "json",
    data_files={"train": TRAIN_FILE, "test": TEST_FILE}
)
print(f"✅ 데이터셋 로드 완료: 학습 {len(dataset['train'])}건, 검증 {len(dataset['test'])}건")

# 4. SFTConfig 학습 파라미터
sft_config = SFTConfig(
    output_dir=OUTPUT_DIR,
    per_device_train_batch_size=8,
    gradient_accumulation_steps=2,
    learning_rate=3e-4,
    warmup_steps=20,
    max_steps=200,
    bf16=True,
    logging_steps=20,
    eval_strategy="steps",
    eval_steps=50,
    save_steps=100,
    save_total_limit=1,
    report_to=["none"],
    dataloader_num_workers=0,
    dataset_text_field=None,
    max_length=512,
)

trainer = SFTTrainer(
    model=model,
    args=sft_config,
    train_dataset=dataset["train"],
    eval_dataset=dataset["test"],
    processing_class=tokenizer,
)

print("\n🚀 Qwen-0.5B 균형 재학습 시작 (총 350스텝, 유효 배치 16)...")
t0 = time.time()
trainer.train()
dur_sec = time.time() - t0
print(f"\n✅ 훈련 완료! 총 소요시간: {dur_sec:.1f}초 ({dur_sec/60:.1f}분)")

# 5. 어댑터 저장 및 모델 병합
print("💾 LoRA 어댑터 가중치 저장 중...")
trainer.save_model(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)

print(f"📦 베이스 모델과 LoRA 영구 병합: {MERGED_DIR} ...")
base_eval = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL,
    dtype=torch.float16,
    device_map="cuda"
)
merged = PeftModel.from_pretrained(base_eval, OUTPUT_DIR)
merged = merged.merge_and_unload()

merged.save_pretrained(MERGED_DIR)
tokenizer.save_pretrained(MERGED_DIR)

print("==================================================================")
print(f"  🎉 Qwen-0.5B v2 균형 모델 생성 완료! 저장 경로: {MERGED_DIR}")
print("==================================================================")
