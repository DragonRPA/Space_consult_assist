import os
import sys
import json
import time
import torch
import torchaudio
from dataclasses import dataclass
from typing import Any, Dict, List, Union
from torch.utils.data import Dataset
from transformers import (
    WhisperProcessor,
    WhisperForConditionalGeneration,
    Seq2SeqTrainingArguments,
    Seq2SeqTrainer
)
from peft import LoraConfig, get_peft_model, PeftModel

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

BASE_MODEL = "openai/whisper-tiny"
DATA_DIR = r"d:\01.AntiGravity\Space_consult_assist\scripts\stt_data"
OUTPUT_DIR = r"d:\01.AntiGravity\Space_consult_assist\scripts\output_whisper_tiny"
MERGED_DIR = r"d:\01.AntiGravity\Space_consult_assist\scripts\merged_whisper_tiny"
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(MERGED_DIR, exist_ok=True)

print("==================================================================")
print("  🎙️ Whisper-Tiny (39M) 한국어 상담 음성 LoRA 파인튜닝 시작")
print("==================================================================")

# 1. 프로세서 및 모델 로드
print(f"📦 프로세서 및 기본 모델 로딩: {BASE_MODEL} ...")
processor = WhisperProcessor.from_pretrained(BASE_MODEL, language="korean", task="transcribe")
model = WhisperForConditionalGeneration.from_pretrained(
    BASE_MODEL,
    device_map="cuda",
    dtype=torch.float16
)

# Whisper 생성 옵션 고정 (한국어 전사)
model.config.forced_decoder_ids = processor.get_decoder_prompt_ids(language="korean", task="transcribe")
model.config.suppress_tokens = []

# 2. LoRA 어댑터 설정
print("🔧 LoRA 어댑터 결합 중 (r=16, alpha=32)...")
lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["q_proj", "v_proj"],
    lora_dropout=0.05,
    bias="none"
)
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()

# 3. 데이터셋 클래스 정의
class WhisperDataset(Dataset):
    def __init__(self, json_path, processor):
        with open(json_path, "r", encoding="utf-8") as f:
            self.records = json.load(f)
        self.processor = processor

    def __len__(self):
        return len(self.records)

    def __getitem__(self, idx):
        item = self.records[idx]
        wav_path = item["audio_path"]
        sentence = item["sentence"]

        import soundfile as sf
        waveform, sr = sf.read(wav_path)
        if len(waveform.shape) > 1:
            waveform = waveform.mean(axis=1)
        waveform = waveform.astype("float32")

        input_features = self.processor.feature_extractor(
            waveform, sampling_rate=16000, return_tensors="pt"
        ).input_features[0]

        labels = self.processor.tokenizer(sentence).input_ids

        return {"input_features": input_features, "labels": labels}

@dataclass
class DataCollatorSpeechSeq2SeqWithPadding:
    processor: Any

    def __call__(self, features: List[Dict[str, Union[List[int], torch.Tensor]]]) -> Dict[str, torch.Tensor]:
        input_features = [{"input_features": feature["input_features"]} for feature in features]
        batch = self.processor.feature_extractor.pad(input_features, return_tensors="pt")

        label_features = [{"input_ids": feature["labels"]} for feature in features]
        labels_batch = self.processor.tokenizer.pad(label_features, return_tensors="pt")

        # 패딩 토큰을 -100으로 변경하여 loss 계산에서 제외
        labels = labels_batch["input_ids"].masked_fill(labels_batch.attention_mask.ne(1), -100)

        # BOS 토큰이 이미 라벨 앞에 있으면 제거 (디코더에서 자동 추가)
        if (labels[:, 0] == self.processor.tokenizer.bos_token_id).all().cpu().item():
            labels = labels[:, 1:]

        batch["labels"] = labels
        return batch

train_dataset = WhisperDataset(os.path.join(DATA_DIR, "train_stt.json"), processor)
eval_dataset = WhisperDataset(os.path.join(DATA_DIR, "test_stt.json"), processor)
data_collator = DataCollatorSpeechSeq2SeqWithPadding(processor=processor)

# 4. 학습 인자 설정
training_args = Seq2SeqTrainingArguments(
    output_dir=OUTPUT_DIR,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    learning_rate=1e-3,
    warmup_steps=20,
    max_steps=120,
    gradient_checkpointing=False,
    fp16=True,
    eval_strategy="steps",
    eval_steps=40,
    save_steps=60,
    logging_steps=10,
    report_to=["none"],
    dataloader_num_workers=0,
    remove_unused_columns=False,
    label_names=["labels"]
)

trainer = Seq2SeqTrainer(
    args=training_args,
    model=model,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
    data_collator=data_collator,
    processing_class=processor.feature_extractor,
)

print("\n🚀 Whisper-Tiny LoRA 훈련 시작 (총 120스텝, 유효 배치 16)...")
t0 = time.time()
train_result = trainer.train()
dur_sec = time.time() - t0
print(f"\n✅ Whisper-Tiny 훈련 완료! 소요시간: {dur_sec:.1f}초 ({dur_sec/60:.1f}분)")

# 5. 어댑터 저장 및 모델 병합
print("💾 LoRA 어댑터 가중치 저장 중...")
trainer.save_model(OUTPUT_DIR)
processor.save_pretrained(OUTPUT_DIR)

print(f"📦 베이스 모델과 LoRA 가중치 영구 병합: {MERGED_DIR} ...")
base_model_eval = WhisperForConditionalGeneration.from_pretrained(
    BASE_MODEL,
    dtype=torch.float16,
    device_map="cuda"
)
merged_model = PeftModel.from_pretrained(base_model_eval, OUTPUT_DIR)
merged_model = merged_model.merge_and_unload()

merged_model.save_pretrained(MERGED_DIR)
processor.save_pretrained(MERGED_DIR)

print("==================================================================")
print(f"  🎉 Whisper-Tiny 한국어 파인튜닝 & 영구 병합 완료! 저장 경로: {MERGED_DIR}")
print("==================================================================")
