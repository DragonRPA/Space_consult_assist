/**
 * partsCatalogTypes.ts
 * 소모품·부품 카탈로그 및 온라인 주문 공통 도메인 타입 정의 (SSOT)
 */

export interface CatalogPartItem {
  id: string;
  part_code: string;
  part_name: string;
  category: '스퀴지/고무' | '브러시/패드' | '호스/필터' | '배터리/전원' | '모터/밸브' | '세제/소모품' | string;
  applicable_models: string[];
  unit_price: number;
  spec: string;
  description: string;
  image_url: string;
  in_stock: boolean;
  lead_time_days: number;
  is_recommended: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
  part: CatalogPartItem;
  quantity: number;
}

export interface PartsOrderRecord {
  order_id: string;
  doc_no: string;
  customer_name: string;
  manager: string;
  phone: string;
  site_company?: string;
  site_worker_name?: string;
  site_worker_phone?: string;
  primary_recipient: 'WORKER' | 'MANAGER';
  dispatch_channel: 'KAKAO' | 'SMS' | 'EMAIL';
  equipment_model: string;
  items: {
    part_code: string;
    part_name: string;
    unit_price: number;
    qty: number;
    total: number;
  }[];
  supply_total: number;
  shipping_fee: number;
  vat: number;
  grand_total: number;
  order_status?: string;
  shipping_address?: string;
  created_at?: string;
}
