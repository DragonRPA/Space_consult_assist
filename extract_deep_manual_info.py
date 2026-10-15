import os
import glob
import pdfplumber
import json

MANUAL_DIR = r"d:\01.AntiGravity\Space_consult_assist\docs\manuals"

def extract_manual_sections():
    # Target representative manuals of core models
    targets = [
        "SPACE_03_S2 매뉴얼.pdf",
        "SPACE_05_S3 매뉴얼.pdf",
        "SPACE_06_S5 매뉴얼.pdf",
        "SPACE_07_S7P 매뉴얼.pdf",
        "SPACE_08_The New S7P 매뉴얼.pdf",
        "SPACE_10_W12 매뉴얼.pdf",
        "SPACE_11_W15 매뉴얼.pdf",
        "SPACE_14_JINCLEAN7 매뉴얼.pdf",
        "SPACE_15_JINCLEAN8 매뉴얼.pdf",
        "SPACE_16_JINCLEAN9 매뉴얼.pdf",
        "SPACE_18_JINCLEAN19 매뉴얼.pdf"
    ]
    
    results = {}

    for fname in targets:
        fpath = os.path.join(MANUAL_DIR, fname)
        if not os.path.exists(fpath):
            continue
        print(f"\n========================================================")
        print(f"Analyzing {fname}...")
        
        with pdfplumber.open(fpath) as pdf:
            model_info = {
                "pages": len(pdf.pages),
                "toc": [],
                "troubleshooting": [],
                "specifications": [],
                "maintenance": [],
                "emergency_or_brake": []
            }
            
            for pno, page in enumerate(pdf.pages, 1):
                text = page.extract_text() or ""
                lines = [l.strip() for l in text.split("\n") if l.strip()]
                
                # Check for TOC
                if pno <= 4 and any(k in text for k in ["목 차", "목차", "INDEX", "CONTENTS"]):
                    model_info["toc"].extend(lines[:20])
                
                # Check for troubleshooting
                if any(k in text for k in ["문제 해결", "고장 진단", "고장 시", "트러블", "원인 및 대책", "이상 현상", "조치 사항", "TROUBLE"]):
                    model_info["troubleshooting"].append({
                        "page": pno,
                        "content": lines[:35]
                    })
                    
                # Check for specs
                if any(k in text for k in ["기계 사양", "주요 제원", "기계 제원", "SPECIFICATION", "기술 데이터", "사양서"]):
                    model_info["specifications"].append({
                        "page": pno,
                        "content": lines[:35]
                    })
                    
                # Check for emergency / brake release / fuse
                if any(k in text for k in ["브레이크 해제", "수동 이동", "견인", "퓨즈", "차단기", "리셋 버튼", "과부하 차단기"]):
                    model_info["emergency_or_brake"].append({
                        "page": pno,
                        "content": lines[:35]
                    })
                    
                # Check for daily maintenance / periodic check
                if any(k in text for k in ["일일 점검", "정기 점검", "유지 관리", "유지 보수", "MAINTENANCE"]):
                    model_info["maintenance"].append({
                        "page": pno,
                        "content": lines[:25]
                    })

            results[fname] = model_info

    # Save summary as JSON for detailed analysis
    out_json = os.path.join(os.path.dirname(__file__), "manual_deep_analysis.json")
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\nAnalysis saved to {out_json}")

if __name__ == "__main__":
    extract_manual_sections()
