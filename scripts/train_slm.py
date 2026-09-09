import os
import sys
import json
import torch

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")
from datasets import Dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    Trainer,
    DataCollatorForSeq2Seq
)
from peft import LoraConfig, get_peft_model, TaskType

# Space Consult Assist — Qwen2.5-0.5B 도메인 특화 LoRA 파인튜닝 스크립트

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRAIN_FILE = os.path.join(BASE_DIR, "scripts", "dataset_train.jsonl")
OUTPUT_DIR = os.path.join(BASE_DIR, "scripts", "output_qwen_0.5b")
MERGED_DIR = os.path.join(BASE_DIR, "scripts", "merged_qwen_0.5b")
MODEL_ID = "Qwen/Qwen2.5-0.5B-Instruct"

def load_jsonl_dataset(file_path):
    data = []
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                data.append(json.loads(line))
    return data

def train():
    print(f"=== Qwen2.5-0.5B 도메인 특화 파인튜닝 시작 ===")
    print(f"CUDA Available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"Device Name: {torch.cuda.get_device_name(0)}")
        print(f"Allocated VRAM: {torch.cuda.memory_allocated(0)/(1024**3):.2f} GB")

    # 1. 토크나이저 및 모델 로드
    print(f"\n[1/5] 모델 및 토크나이저 로드: {MODEL_ID}")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, use_fast=True)
    
    # 0.5B 모델은 bfloat16/float16으로 전체 로드해도 VRAM 약 1.0GB만 차지함
    dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        dtype=dtype,
        device_map="auto"
    )

    # 2. LoRA 어댑터 설정
    print("\n[2/5] LoRA 어댑터 설정")
    lora_config = LoraConfig(
        r=16,
        lora_alpha=32,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type=TaskType.CAUSAL_LM
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    # 3. 데이터셋 전처리
    print(f"\n[3/5] 데이터셋 로드 및 토크나이징: {TRAIN_FILE}")
    raw_data = load_jsonl_dataset(TRAIN_FILE)
    print(f"총 훈련 데이터 수: {len(raw_data)} 건")

    def format_and_tokenize(batch):
        input_ids_list = []
        labels_list = []
        
        for messages in batch["messages"]:
            # Qwen2.5 ChatML 템플릿 적용
            full_text = tokenizer.apply_chat_template(messages, tokenize=False)
            tokenized = tokenizer(
                full_text,
                truncation=True,
                max_length=512,
                padding=False
            )
            input_ids = tokenized["input_ids"]
            # Causal LM은 input_ids를 그대로 labels로 사용 (CrossEntropy)
            labels = list(input_ids)
            
            input_ids_list.append(input_ids)
            labels_list.append(labels)
            
        return {"input_ids": input_ids_list, "labels": labels_list}

    hf_dataset = Dataset.from_list([{"messages": d["messages"]} for d in raw_data])
    tokenized_dataset = hf_dataset.map(
        format_and_tokenize,
        batched=True,
        batch_size=100,
        remove_columns=["messages"]
    )

    # 4. 훈련 인자 설정
    print("\n[4/5] 훈련 파라미터 구성")
    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        per_device_train_batch_size=4,
        gradient_accumulation_steps=4,
        learning_rate=3e-4,
        max_steps=300,             # 초경량 실증 검증: 300 steps (약 3~5분)
        logging_steps=20,
        save_steps=150,
        fp16=(dtype == torch.float16),
        bf16=(dtype == torch.bfloat16),
        optim="adamw_torch",
        report_to="none",
        warmup_steps=15,
        logging_first_step=True
    )

    data_collator = DataCollatorForSeq2Seq(
        tokenizer=tokenizer,
        model=model,
        padding=True,
        pad_to_multiple_of=8
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset,
        data_collator=data_collator,
    )

    print("\n=== [파인튜닝 학습 시작] ===")
    trainer.train()

    # 어댑터 저장
    print(f"\n[5/5] 어댑터 가중치 저장: {OUTPUT_DIR}")
    model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)

    # 베이스 모델과 LoRA 가중치 병합(Merge)하여 단일 모델로 저장
    print(f"베이스 모델과 가중치 병합(Merge) 진행 중: {MERGED_DIR}")
    merged_model = model.merge_and_unload()
    merged_model.save_pretrained(MERGED_DIR)
    tokenizer.save_pretrained(MERGED_DIR)

    print("\n=== [학습 및 모델 병합 완료!] ===")
    print(f"- 최종 병합 모델 위치: {MERGED_DIR}")

if __name__ == "__main__":
    train()
