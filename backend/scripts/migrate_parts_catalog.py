import psycopg
import json

conn_str = 'postgresql://postgres.eknwzjcbchbefdlykqgl:jUHGAmVsSeXc1jdR@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres'

# 기본 고품질 부품 시각화 SVG 목업 생성기
def create_part_svg(name: str, code: str, category: str, color_accent: str = "#1d4ed8"):
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="400" height="280" viewBox="0 0 400 280">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
        <linearGradient id="partGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="{color_accent}"/>
          <stop offset="100%" stop-color="#1e3a8a"/>
        </linearGradient>
      </defs>
      <rect width="400" height="280" fill="url(#bgGrad)" rx="8"/>
      <rect x="12" y="12" width="376" height="256" fill="none" stroke="#334155" stroke-width="1.5" rx="6"/>
      
      <!-- 상단 카테고리 뱃지 -->
      <rect x="24" y="24" width="90" height="24" fill="{color_accent}" rx="4"/>
      <text x="69" y="40" fill="#ffffff" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">{category}</text>
      
      <rect x="122" y="24" width="130" height="24" fill="#334155" rx="4"/>
      <text x="187" y="40" fill="#94a3b8" font-family="sans-serif" font-size="11" font-weight="600" text-anchor="middle">{code}</text>

      <!-- 중앙 정품 부품 시각화 아이콘/도해 -->
      <circle cx="200" cy="130" r="54" fill="#1e293b" stroke="{color_accent}" stroke-width="3"/>
      <rect x="160" y="122" width="80" height="16" fill="{color_accent}" rx="3"/>
      <circle cx="200" cy="130" r="16" fill="#0f172a" stroke="#ffffff" stroke-width="2"/>
      
      <!-- 하단 품명 -->
      <rect x="24" y="210" width="352" height="42" fill="#0f172a" rx="4" stroke="#1e293b"/>
      <text x="200" y="236" fill="#f8fafc" font-family="sans-serif" font-size="13.5" font-weight="bold" text-anchor="middle">{name[:24]}</text>
    </svg>"""
    import urllib.parse
    return f"data:image/svg+xml;utf8,{urllib.parse.quote(svg)}"

# 전사 표준 부품 카탈로그 시드 데이터 (16대 핵심 소모품)
INITIAL_PARTS = [
    # J600T 전용 & 공용
    {
        "id": "part-j600t-sqg-825",
        "part_code": "J600T-SQG-825",
        "part_name": "825mm 내유성 라텍스 스퀴지 블레이드 세트 (앞/뒤)",
        "category": "스퀴지/고무",
        "applicable_models": ["J600T", "S5"],
        "unit_price": 45000,
        "spec": "825mm 내마모 라텍스 고무 (4면 반전 가능)",
        "description": "오일 및 세제 부식에 강한 최고급 라텍스 소재. 스퀴지 립 마모 시 상하/좌우 4면 반전 장착으로 4회 재사용 가능.",
        "image_url": create_part_svg("825mm 스퀴지 블레이드", "J600T-SQG-825", "스퀴지/고무", "#d97706"),
        "in_stock": True,
        "lead_time_days": 1,
        "is_recommended": True
    },
    {
        "id": "part-j600t-brs-22",
        "part_code": "J600T-BRS-22",
        "part_name": "22인치 고효율 바닥 세척 브러시 어셈블리",
        "category": "브러시/패드",
        "applicable_models": ["J600T", "S7"],
        "unit_price": 85000,
        "spec": "560mm 나일론 0.6mm 직경 (155rpm)",
        "description": "에폭시, 우레탄, 아스타일 바닥 전용 고밀도 나일론 브러시. 원터치 퀵 릴리즈 클러치 플레이트 결합형.",
        "image_url": create_part_svg("22인치 바닥 세척 브러시", "J600T-BRS-22", "브러시/패드", "#2563eb"),
        "in_stock": True,
        "lead_time_days": 1,
        "is_recommended": True
    },
    {
        "id": "part-j600t-pad-blk",
        "part_code": "J600T-PAD-BLK",
        "part_name": "22인치 고밀도 바닥 박리/세척 패드 (흑색 5장입)",
        "category": "브러시/패드",
        "applicable_models": ["J600T", "S7"],
        "unit_price": 28000,
        "spec": "22인치 흑색 중작업용 박리 패드",
        "description": "기존 왁스층 및 찌든 때 완전 박리용 고장력 패드. 패드 홀더 장착 후 간편 부착.",
        "image_url": create_part_svg("22인치 세척 패드(흑색)", "J600T-PAD-BLK", "브러시/패드", "#475569"),
        "in_stock": True,
        "lead_time_days": 1,
        "is_recommended": False
    },
    {
        "id": "part-j600t-hos-38",
        "part_code": "J600T-HOS-38",
        "part_name": "38mm 강화 오수 흡입 주름 호스 (1.5m, 커프 포함)",
        "category": "호스/필터",
        "applicable_models": ["J600T", "J800", "S5", "S7"],
        "unit_price": 35000,
        "spec": "38mm 내경, PVC 스틸 와이어 보강 주름관",
        "description": "강한 진공 부압에도 찌그러지지 않는 내부 스틸 와이어 보강형. 양단 38mm 밀착 고무 커프 일체형.",
        "image_url": create_part_svg("38mm 흡입 주름 호스", "J600T-HOS-38", "호스/필터", "#059669"),
        "in_stock": True,
        "lead_time_days": 1,
        "is_recommended": True
    },
    {
        "id": "part-j600t-flt-01",
        "part_code": "J600T-FLT-01",
        "part_name": "오수탱크 플로트 역류 차단 밸브 필터 어셈블리",
        "category": "호스/필터",
        "applicable_models": ["J600T", "J800"],
        "unit_price": 24000,
        "spec": "부구형 오수 만수 자동 차단 및 스테인리스 거름망",
        "description": "오수 만수 시 진공 모터로 물이 넘어가지 않도록 차단하는 플로트 밸브 케이지 및 이물질 필터.",
        "image_url": create_part_svg("플로트 역류 차단 필터", "J600T-FLT-01", "호스/필터", "#0284c7"),
        "in_stock": True,
        "lead_time_days": 1,
        "is_recommended": False
    },
    {
        "id": "part-j600t-fus-40",
        "part_code": "J600T-FUS-40",
        "part_name": "24V 40A 메인 세라믹 전원 퓨즈 (5개입 팩)",
        "category": "배터리/전원",
        "applicable_models": ["J600T", "S5", "S3"],
        "unit_price": 15000,
        "spec": "24V 40A 속단형 세라믹 튜브 퓨즈",
        "description": "과전류 인입 시 모터 코일을 보호하는 안전 퓨즈. 오수탱크 하부 퓨즈함 내 1:1 교체형.",
        "image_url": create_part_svg("24V 40A 세라믹 퓨즈", "J600T-FUS-40", "배터리/전원", "#dc2626"),
        "in_stock": True,
        "lead_time_days": 1,
        "is_recommended": False
    },

    # J800 대형 탑승식 전용
    {
        "id": "part-j800-sqg-1190",
        "part_code": "J800-SQG-1190",
        "part_name": "1,190mm 내유성 와이드 스퀴지 블레이드 세트 (앞/뒤)",
        "category": "스퀴지/고무",
        "applicable_models": ["J800"],
        "unit_price": 65000,
        "spec": "1,190mm 대형 탑승식 전용 폴리우레탄 내유 립",
        "description": "지하주차장 광폭 청소용 와이드 스퀴지 립. 마모율이 낮고 기름때에 변형되지 않는 우레탄 소재.",
        "image_url": create_part_svg("1190mm 와이드 스퀴지", "J800-SQG-1190", "스퀴지/고무", "#d97706"),
        "in_stock": True,
        "lead_time_days": 1,
        "is_recommended": True
    },
    {
        "id": "part-j800-brs-16d",
        "part_code": "J800-BRS-16D",
        "part_name": "16인치 듀얼 바닥 세척 디스크 브러시 (2개 세트)",
        "category": "브러시/패드",
        "applicable_models": ["J800"],
        "unit_price": 140000,
        "spec": "405mm 좌/우 트윈 회전 브러시 세트",
        "description": "J800 좌우 듀얼 모터 전용 브러시 1쌍. 역회전 방식으로 중앙으로 오수를 모아 흡입력 극대화.",
        "image_url": create_part_svg("16인치 듀얼 세척 브러시", "J800-BRS-16D", "브러시/패드", "#2563eb"),
        "in_stock": True,
        "lead_time_days": 1,
        "is_recommended": True
    },
    {
        "id": "part-j800-gsk-140",
        "part_code": "J800-GSK-140",
        "part_name": "140L 오수탱크 상부 밀폐 실링 가스켓 고무",
        "category": "호스/필터",
        "applicable_models": ["J800"],
        "unit_price": 38000,
        "spec": "140L 탱크 테두리 전용 EPDM 방진 발포 가스켓",
        "description": "진공 흡입 부압 유출을 완벽 차단하는 고기밀성 EPDM 고무 패킹. 경화/들뜸 시 즉시 교체 필요.",
        "image_url": create_part_svg("140L 오수탱크 가스켓", "J800-GSK-140", "호스/필터", "#059669"),
        "in_stock": True,
        "lead_time_days": 1,
        "is_recommended": False
    },
    {
        "id": "part-j800-fus-200",
        "part_code": "J800-FUS-200",
        "part_name": "24V 200A 산업용 볼트 체결형 메인 퓨즈 블록",
        "category": "배터리/전원",
        "applicable_models": ["J800"],
        "unit_price": 28000,
        "spec": "200A 볼트 체결형 ANL 고용량 퓨즈",
        "description": "대형 구동 모터 및 유압 리프트 회로를 보호하는 주전원 볼트 체결형 대용량 퓨즈.",
        "image_url": create_part_svg("24V 200A 메인 퓨즈", "J800-FUS-200", "배터리/전원", "#dc2626"),
        "in_stock": True,
        "lead_time_days": 1,
        "is_recommended": False
    },

    # S7 탑승형
    {
        "id": "part-s7-sqg-1120",
        "part_code": "S7-SQG-1120",
        "part_name": "1,120mm 탑승형 스퀴지 고무 블레이드 세트 (앞/뒤)",
        "category": "스퀴지/고무",
        "applicable_models": ["S7"],
        "unit_price": 58000,
        "spec": "1,120mm 반전형 고무 립",
        "description": "S7 표준 1,120mm 곡면 스퀴지 프레임에 최적 밀착되는 고탄성 라텍스 립 세트.",
        "image_url": create_part_svg("1120mm 스퀴지 고무", "S7-SQG-1120", "스퀴지/고무", "#d97706"),
        "in_stock": True,
        "lead_time_days": 1,
        "is_recommended": True
    },
    {
        "id": "part-s7-val-24v",
        "part_code": "S7-VAL-24V",
        "part_name": "24V 솔레노이드 청수 전자 개폐 밸브",
        "category": "모터/밸브",
        "applicable_models": ["S7", "J600T", "J800"],
        "unit_price": 42000,
        "spec": "24V DC 상시 닫힘형 (NC) 청수 제어 밸브",
        "description": "장비 정지 시 세척수 자동 누수 차단 및 브러시 가동 시 연동 분사 전자 밸브.",
        "image_url": create_part_svg("24V 청수 전자 밸브", "S7-VAL-24V", "모터/밸브", "#7c3aed"),
        "in_stock": True,
        "lead_time_days": 2,
        "is_recommended": False
    },

    # S5 소형 탑승형 & S3 보행식
    {
        "id": "part-s5-sqg-705",
        "part_code": "S5-SQG-705",
        "part_name": "705mm 콤팩트 스퀴지 블레이드 세트 (앞/뒤)",
        "category": "스퀴지/고무",
        "applicable_models": ["S5"],
        "unit_price": 42000,
        "spec": "705mm 소형 탑승형 전용 립",
        "description": "엘리베이터 및 협소 통로용 소형 탑승식 S5 전용 스퀴지 고무 세트.",
        "image_url": create_part_svg("705mm 스퀴지 블레이드", "S5-SQG-705", "스퀴지/고무", "#d97706"),
        "in_stock": True,
        "lead_time_days": 1,
        "is_recommended": True
    },
    {
        "id": "part-s3-sqg-680",
        "part_code": "S3-SQG-680",
        "part_name": "680mm 보행식 스퀴지 블레이드 세트 (앞/뒤)",
        "category": "스퀴지/고무",
        "applicable_models": ["S3"],
        "unit_price": 38000,
        "spec": "680mm 보행식 표준 고무 립",
        "description": "보행식 청소차 S3 전용 가성비 표준 스퀴지 고무 세트.",
        "image_url": create_part_svg("680mm 보행식 스퀴지", "S3-SQG-680", "스퀴지/고무", "#d97706"),
        "in_stock": True,
        "lead_time_days": 1,
        "is_recommended": True
    },
    {
        "id": "part-s3-brs-18",
        "part_code": "S3-BRS-18",
        "part_name": "18인치 디스크 세척 브러시 어셈블리",
        "category": "브러시/패드",
        "applicable_models": ["S3"],
        "unit_price": 75000,
        "spec": "450mm 보행식 전용 나일론 브러시",
        "description": "S3 보행형 전용 표준 세척 브러시. 원터치 잠금식 센터 락 장착.",
        "image_url": create_part_svg("18인치 세척 브러시", "S3-BRS-18", "브러시/패드", "#2563eb"),
        "in_stock": True,
        "lead_time_days": 1,
        "is_recommended": True
    },

    # 공용 전용 세제 & 약품
    {
        "id": "part-chem-floor-18l",
        "part_code": "CHEM-FLR-18L",
        "part_name": "청소차 전용 저기포성 바닥 중성 세척제 (18.75L)",
        "category": "세제/소모품",
        "applicable_models": ["J600T", "J800", "S7", "S5", "S3"],
        "unit_price": 32000,
        "spec": "18.75L 고농축 저기포성 중성 포뮬러",
        "description": "흡입 모터 내 거품 흡입을 원천 방지하는 전용 저기포 세제. 찌든 때 및 타이어 자국 우수 분해.",
        "image_url": create_part_svg("저기포성 바닥 세척제", "CHEM-FLR-18L", "세제/소모품", "#0d9488"),
        "in_stock": True,
        "lead_time_days": 1,
        "is_recommended": True
    }
]

sql_schema = [
    # 1. parts_catalog 테이블 생성
    """
    CREATE TABLE IF NOT EXISTS public.parts_catalog (
        id VARCHAR(50) PRIMARY KEY,
        part_code VARCHAR(50) NOT NULL UNIQUE,
        part_name VARCHAR(200) NOT NULL,
        category VARCHAR(50) NOT NULL,
        applicable_models TEXT[] NOT NULL,
        unit_price INTEGER NOT NULL DEFAULT 0,
        spec TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        image_url TEXT NOT NULL DEFAULT '',
        in_stock BOOLEAN DEFAULT true,
        lead_time_days INTEGER DEFAULT 1,
        is_recommended BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
    );
    """,

    # 2. parts_orders 테이블 생성 (주문 내역 무누락 DB 저장)
    """
    CREATE TABLE IF NOT EXISTS public.parts_orders (
        order_id VARCHAR(50) PRIMARY KEY,
        doc_no VARCHAR(50),
        customer_name VARCHAR(100) NOT NULL,
        manager VARCHAR(100) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        site_company VARCHAR(100),
        site_worker_name VARCHAR(100),
        site_worker_phone VARCHAR(50),
        primary_recipient VARCHAR(50) NOT NULL DEFAULT 'WORKER',
        dispatch_channel VARCHAR(20) NOT NULL DEFAULT 'KAKAO',
        equipment_model VARCHAR(50) NOT NULL,
        items JSONB NOT NULL,
        supply_total INTEGER NOT NULL,
        shipping_fee INTEGER NOT NULL DEFAULT 3000,
        vat INTEGER NOT NULL,
        grand_total INTEGER NOT NULL,
        order_status VARCHAR(50) NOT NULL DEFAULT 'ORDER_RECEIVED',
        shipping_address TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
    );
    """,

    # 3. RLS 정책
    "ALTER TABLE public.parts_catalog ENABLE ROW LEVEL SECURITY;",
    "DROP POLICY IF EXISTS \"Allow public read parts_catalog\" ON public.parts_catalog;",
    "CREATE POLICY \"Allow public read parts_catalog\" ON public.parts_catalog FOR SELECT TO anon, authenticated USING (true);",
    "DROP POLICY IF EXISTS \"Allow public all parts_catalog\" ON public.parts_catalog;",
    "CREATE POLICY \"Allow public all parts_catalog\" ON public.parts_catalog FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);",

    "ALTER TABLE public.parts_orders ENABLE ROW LEVEL SECURITY;",
    "DROP POLICY IF EXISTS \"Allow public read parts_orders\" ON public.parts_orders;",
    "CREATE POLICY \"Allow public read parts_orders\" ON public.parts_orders FOR SELECT TO anon, authenticated USING (true);",
    "DROP POLICY IF EXISTS \"Allow public all parts_orders\" ON public.parts_orders;",
    "CREATE POLICY \"Allow public all parts_orders\" ON public.parts_orders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);"
]

def main():
    print("Connecting to Supabase PostgreSQL for parts_catalog migration...")
    with psycopg.connect(conn_str, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            for stmt in sql_schema:
                s = stmt.strip()
                if s:
                    cur.execute(s)
            
            # 시드 데이터 Upsert
            upsert_query = """
            INSERT INTO public.parts_catalog (
                id, part_code, part_name, category, applicable_models,
                unit_price, spec, description, image_url, in_stock,
                lead_time_days, is_recommended, updated_at
            ) VALUES (
                %(id)s, %(part_code)s, %(part_name)s, %(category)s, %(applicable_models)s,
                %(unit_price)s, %(spec)s, %(description)s, %(image_url)s, %(in_stock)s,
                %(lead_time_days)s, %(is_recommended)s, now()
            ) ON CONFLICT (id) DO UPDATE SET
                part_code = EXCLUDED.part_code,
                part_name = EXCLUDED.part_name,
                category = EXCLUDED.category,
                applicable_models = EXCLUDED.applicable_models,
                unit_price = EXCLUDED.unit_price,
                spec = EXCLUDED.spec,
                description = EXCLUDED.description,
                image_url = EXCLUDED.image_url,
                in_stock = EXCLUDED.in_stock,
                lead_time_days = EXCLUDED.lead_time_days,
                is_recommended = EXCLUDED.is_recommended,
                updated_at = now();
            """
            for part in INITIAL_PARTS:
                cur.execute(upsert_query, part)

        conn.commit()
    print(f"Parts catalog migration successful! Seeded {len(INITIAL_PARTS)} catalog parts.")

if __name__ == '__main__':
    main()
