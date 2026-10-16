import { SPACE_DUST_OFFICIAL_CATALOG } from './spaceDustCatalogSeed';
import { SPACE_DUST_OFFICIAL_MANUALS, type EquipmentManualItem } from './spaceDustManualsSeed';

export type SpaceDustCatalogItem = (typeof SPACE_DUST_OFFICIAL_CATALOG)[number];

export interface CatalogVisualCard {
  id: string;
  model: string;
  section: '외관' | '제원' | '구조' | '조작' | '비교';
  title: string;
  imageUrl: string;
  pdfFile: string;
  defaultSelected?: boolean;
}

export interface ModelCatalogBundle {
  modelKey: string;
  label: string;
  lineup: 'SP' | 'JC' | 'ROBOT';
  visualCards: CatalogVisualCard[];
  parts: SpaceDustCatalogItem[];
  manuals: EquipmentManualItem[];
}

export const MODEL_KEYS = [
  'S7P',
  'The New S7P',
  'S5',
  'S3',
  'S3mini',
  'S2',
  'S12',
  'S16P',
  'W12',
  'W15',
  '쓰담',
  '플로어닥터',
  '닥터오비트',
  'J600',
  'J700',
  'J800',
  'J900',
  'J1300',
  'J1900',
  'J1900CAR',
  'R3 SCP',
  'R3 VAC',
  'Sparky',
] as const;

const RAW_VISUAL_MAP: Record<string, Omit<CatalogVisualCard, 'id' | 'model'>[]> = {
  'S7P': [
    { section: '외관', title: 'S7P 외관', imageUrl: '/catalog-pages/sp_s7_hero.webp', pdfFile: '/manuals/space_manual_12.pdf', defaultSelected: true },
    { section: '제원', title: 'S7P 제원표', imageUrl: '/catalog-pages/sp_s7_spec.webp', pdfFile: '/manuals/space_manual_12.pdf', defaultSelected: true },
    { section: '구조', title: 'S7P 구조·명칭', imageUrl: '/catalog-pages/man_s7p_struct.webp', pdfFile: '/manuals/space_manual_07.pdf', defaultSelected: true },
    { section: '조작', title: 'S7P 조작부', imageUrl: '/catalog-pages/man_s7p_ctrl.webp', pdfFile: '/manuals/space_manual_07.pdf', defaultSelected: false },
  ],
  'The New S7P': [
    { section: '외관', title: 'The New S7P 외관', imageUrl: '/catalog-pages/sp_s7_hero.webp', pdfFile: '/manuals/space_manual_12.pdf', defaultSelected: true },
    { section: '제원', title: 'The New S7P 제원표', imageUrl: '/catalog-pages/sp_s7_spec.webp', pdfFile: '/manuals/space_manual_12.pdf', defaultSelected: true },
    { section: '구조', title: 'The New S7P 구조·명칭', imageUrl: '/catalog-pages/man_news7p_struct.webp', pdfFile: '/manuals/space_manual_08.pdf', defaultSelected: true },
    { section: '조작', title: 'The New S7P 조작부', imageUrl: '/catalog-pages/man_news7p_ctrl.webp', pdfFile: '/manuals/space_manual_08.pdf', defaultSelected: false },
  ],
  'S5': [
    { section: '외관', title: 'S5 외관', imageUrl: '/catalog-pages/sp_s5_hero.webp', pdfFile: '/manuals/space_manual_12.pdf', defaultSelected: true },
    { section: '제원', title: 'S5 제원표', imageUrl: '/catalog-pages/sp_s5_spec.webp', pdfFile: '/manuals/space_manual_12.pdf', defaultSelected: true },
    { section: '구조', title: 'S5 구조·명칭', imageUrl: '/catalog-pages/man_s5_struct.webp', pdfFile: '/manuals/space_manual_06.pdf', defaultSelected: true },
    { section: '조작', title: 'S5 조작부', imageUrl: '/catalog-pages/man_s5_ctrl.webp', pdfFile: '/manuals/space_manual_06.pdf', defaultSelected: false },
  ],
  'S3': [
    { section: '외관', title: 'S3 외관', imageUrl: '/catalog-pages/sp_s3_hero.webp', pdfFile: '/manuals/space_manual_12.pdf', defaultSelected: true },
    { section: '제원', title: 'S3 제원표', imageUrl: '/catalog-pages/sp_s3_spec.webp', pdfFile: '/manuals/space_manual_12.pdf', defaultSelected: true },
    { section: '구조', title: 'S3 구조·명칭', imageUrl: '/catalog-pages/man_s3_struct.webp', pdfFile: '/manuals/space_manual_05.pdf', defaultSelected: true },
    { section: '조작', title: 'S3 조작부', imageUrl: '/catalog-pages/man_s3_ctrl.webp', pdfFile: '/manuals/space_manual_05.pdf', defaultSelected: false },
  ],
  'S3mini': [
    { section: '외관', title: 'S3mini 외관', imageUrl: '/catalog-pages/sp_s3mini_hero.webp', pdfFile: '/manuals/space_manual_12.pdf', defaultSelected: true },
    { section: '제원', title: 'S3mini 제원표', imageUrl: '/catalog-pages/sp_s3mini_spec.webp', pdfFile: '/manuals/space_manual_12.pdf', defaultSelected: true },
    { section: '구조', title: 'S3mini 구조·명칭', imageUrl: '/catalog-pages/man_s3mini_struct.webp', pdfFile: '/manuals/space_manual_04.pdf', defaultSelected: true },
    { section: '조작', title: 'S3mini 조작부', imageUrl: '/catalog-pages/man_s3mini_ctrl.webp', pdfFile: '/manuals/space_manual_04.pdf', defaultSelected: false },
  ],
  'S2': [
    { section: '외관', title: 'S2 외관', imageUrl: '/catalog-pages/sp_s2_hero.webp', pdfFile: '/manuals/space_manual_12.pdf', defaultSelected: true },
    { section: '제원', title: 'S2 제원표', imageUrl: '/catalog-pages/sp_s2_spec.webp', pdfFile: '/manuals/space_manual_12.pdf', defaultSelected: true },
    { section: '구조', title: 'S2 구조·명칭', imageUrl: '/catalog-pages/man_s2_struct.webp', pdfFile: '/manuals/space_manual_03.pdf', defaultSelected: true },
    { section: '조작', title: 'S2 조작부', imageUrl: '/catalog-pages/man_s2_ctrl.webp', pdfFile: '/manuals/space_manual_03.pdf', defaultSelected: false },
  ],
  'S12': [
    { section: '외관', title: 'S12 외관', imageUrl: '/catalog-pages/sp_s12_hero.webp', pdfFile: '/manuals/space_manual_12.pdf', defaultSelected: true },
    { section: '제원', title: 'S12 제원표', imageUrl: '/catalog-pages/sp_s12_spec.webp', pdfFile: '/manuals/space_manual_12.pdf', defaultSelected: true },
    { section: '구조', title: 'S12 구조·명칭', imageUrl: '/catalog-pages/man_s12_struct.webp', pdfFile: '/manuals/space_manual_09.pdf', defaultSelected: true },
    { section: '조작', title: 'S12 조작부', imageUrl: '/catalog-pages/man_s12_ctrl.webp', pdfFile: '/manuals/space_manual_09.pdf', defaultSelected: false },
  ],
  'S16P': [
    { section: '제원', title: 'S16P 카탈로그', imageUrl: '/catalog-pages/sp_s16p_spec.webp', pdfFile: '/manuals/space_manual_25.pdf', defaultSelected: true },
    { section: '구조', title: 'S12/S16P 구조·명칭', imageUrl: '/catalog-pages/man_s12_struct.webp', pdfFile: '/manuals/space_manual_09.pdf', defaultSelected: true },
    { section: '조작', title: 'S12/S16P 조작부', imageUrl: '/catalog-pages/man_s12_ctrl.webp', pdfFile: '/manuals/space_manual_09.pdf', defaultSelected: false },
  ],
  'W12': [
    { section: '외관', title: 'W12 외관', imageUrl: '/catalog-pages/sp_w12_hero.webp', pdfFile: '/manuals/space_manual_12.pdf', defaultSelected: true },
    { section: '제원', title: 'W12 제원표', imageUrl: '/catalog-pages/sp_w12_spec.webp', pdfFile: '/manuals/space_manual_12.pdf', defaultSelected: true },
    { section: '구조', title: 'W12 구조·명칭', imageUrl: '/catalog-pages/man_w12_struct.webp', pdfFile: '/manuals/space_manual_10.pdf', defaultSelected: true },
    { section: '조작', title: 'W12 조작부', imageUrl: '/catalog-pages/man_w12_ctrl.webp', pdfFile: '/manuals/space_manual_10.pdf', defaultSelected: false },
  ],
  'W15': [
    { section: '외관', title: 'W15 외관', imageUrl: '/catalog-pages/sp_w15_hero.webp', pdfFile: '/manuals/space_manual_12.pdf', defaultSelected: true },
    { section: '제원', title: 'W15 제원표', imageUrl: '/catalog-pages/sp_w15_spec.webp', pdfFile: '/manuals/space_manual_12.pdf', defaultSelected: true },
    { section: '구조', title: 'W15 구조·명칭', imageUrl: '/catalog-pages/man_w15_struct.webp', pdfFile: '/manuals/space_manual_11.pdf', defaultSelected: true },
    { section: '조작', title: 'W15 조작부', imageUrl: '/catalog-pages/man_w15_ctrl.webp', pdfFile: '/manuals/space_manual_11.pdf', defaultSelected: false },
  ],
  '쓰담': [
    { section: '외관', title: '쓰담 외관', imageUrl: '/catalog-pages/sp_ssdam_hero.webp', pdfFile: '/manuals/space_manual_12.pdf', defaultSelected: true },
    { section: '제원', title: '쓰담 제원표', imageUrl: '/catalog-pages/sp_ssdam_spec.webp', pdfFile: '/manuals/space_manual_12.pdf', defaultSelected: true },
  ],
  '플로어닥터': [
    { section: '외관', title: '플로어닥터 외관', imageUrl: '/catalog-pages/sp_floordr_hero.webp', pdfFile: '/manuals/space_manual_12.pdf', defaultSelected: true },
    { section: '제원', title: '플로어닥터 제원표', imageUrl: '/catalog-pages/sp_floordr_spec.webp', pdfFile: '/manuals/space_manual_12.pdf', defaultSelected: true },
    { section: '구조', title: '플로어닥터 구조·명칭', imageUrl: '/catalog-pages/man_floordr_struct.webp', pdfFile: '/manuals/space_manual_02.pdf', defaultSelected: true },
    { section: '조작', title: '플로어닥터 조작부', imageUrl: '/catalog-pages/man_floordr_ctrl.webp', pdfFile: '/manuals/space_manual_02.pdf', defaultSelected: false },
  ],
  '닥터오비트': [
    { section: '외관', title: '닥터오비트 외관', imageUrl: '/catalog-pages/sp_drorbit_hero.webp', pdfFile: '/manuals/space_manual_12.pdf', defaultSelected: true },
    { section: '제원', title: '닥터오비트 제원표', imageUrl: '/catalog-pages/sp_drorbit_spec.webp', pdfFile: '/manuals/space_manual_12.pdf', defaultSelected: true },
    { section: '구조', title: '닥터오비트 구조·명칭', imageUrl: '/catalog-pages/man_drorbit_struct.webp', pdfFile: '/manuals/space_manual_01.pdf', defaultSelected: true },
    { section: '조작', title: '닥터오비트 조작부', imageUrl: '/catalog-pages/man_drorbit_ctrl.webp', pdfFile: '/manuals/space_manual_01.pdf', defaultSelected: false },
  ],
  'J600': [
    { section: '제원', title: 'J600/J600T 카탈로그', imageUrl: '/catalog-pages/jc_j600_spec.webp', pdfFile: '/manuals/space_manual_20.pdf', defaultSelected: true },
    { section: '구조', title: 'J600 구조·명칭', imageUrl: '/catalog-pages/man_j600_struct.webp', pdfFile: '/manuals/space_manual_13.pdf', defaultSelected: true },
    { section: '조작', title: 'J600 조작부', imageUrl: '/catalog-pages/man_j600_ctrl.webp', pdfFile: '/manuals/space_manual_13.pdf', defaultSelected: true },
    { section: '비교', title: 'JC 사양 비교표', imageUrl: '/catalog-pages/jc_compare_spec.webp', pdfFile: '/manuals/space_manual_20.pdf', defaultSelected: false },
  ],
  'J700': [
    { section: '제원', title: 'J700 카탈로그', imageUrl: '/catalog-pages/jc_j700_spec.webp', pdfFile: '/manuals/space_manual_20.pdf', defaultSelected: true },
    { section: '구조', title: 'J700 구조·명칭', imageUrl: '/catalog-pages/man_j700_struct.webp', pdfFile: '/manuals/space_manual_14.pdf', defaultSelected: true },
    { section: '조작', title: 'J700 조작부', imageUrl: '/catalog-pages/man_j700_ctrl.webp', pdfFile: '/manuals/space_manual_14.pdf', defaultSelected: true },
    { section: '비교', title: 'JC 사양 비교표', imageUrl: '/catalog-pages/jc_compare_spec.webp', pdfFile: '/manuals/space_manual_20.pdf', defaultSelected: false },
  ],
  'J800': [
    { section: '제원', title: 'J800 카탈로그', imageUrl: '/catalog-pages/jc_j800_spec.webp', pdfFile: '/manuals/space_manual_20.pdf', defaultSelected: true },
    { section: '구조', title: 'J800 구조·명칭', imageUrl: '/catalog-pages/man_j800_struct.webp', pdfFile: '/manuals/space_manual_15.pdf', defaultSelected: true },
    { section: '조작', title: 'J800 조작부', imageUrl: '/catalog-pages/man_j800_ctrl.webp', pdfFile: '/manuals/space_manual_15.pdf', defaultSelected: true },
    { section: '비교', title: 'JC 사양 비교표', imageUrl: '/catalog-pages/jc_compare_spec.webp', pdfFile: '/manuals/space_manual_20.pdf', defaultSelected: false },
  ],
  'J900': [
    { section: '제원', title: 'J900 카탈로그', imageUrl: '/catalog-pages/jc_j900_spec.webp', pdfFile: '/manuals/space_manual_20.pdf', defaultSelected: true },
    { section: '구조', title: 'J900 구조·명칭', imageUrl: '/catalog-pages/man_j900_struct.webp', pdfFile: '/manuals/space_manual_16.pdf', defaultSelected: true },
    { section: '조작', title: 'J900 조작부', imageUrl: '/catalog-pages/man_j900_ctrl.webp', pdfFile: '/manuals/space_manual_16.pdf', defaultSelected: true },
    { section: '비교', title: 'JC 사양 비교표', imageUrl: '/catalog-pages/jc_compare_spec.webp', pdfFile: '/manuals/space_manual_20.pdf', defaultSelected: false },
  ],
  'J1300': [
    { section: '제원', title: 'J1300 카탈로그', imageUrl: '/catalog-pages/jc_j1300_spec.webp', pdfFile: '/manuals/space_manual_20.pdf', defaultSelected: true },
    { section: '구조', title: 'J1300 구조·명칭', imageUrl: '/catalog-pages/man_j1300_struct.webp', pdfFile: '/manuals/space_manual_17.pdf', defaultSelected: true },
    { section: '조작', title: 'J1300 조작부', imageUrl: '/catalog-pages/man_j1300_ctrl.webp', pdfFile: '/manuals/space_manual_17.pdf', defaultSelected: true },
    { section: '비교', title: 'JC 사양 비교표', imageUrl: '/catalog-pages/jc_compare_spec.webp', pdfFile: '/manuals/space_manual_20.pdf', defaultSelected: false },
  ],
  'J1900': [
    { section: '제원', title: 'J1900 카탈로그', imageUrl: '/catalog-pages/jc_j1900_spec.webp', pdfFile: '/manuals/space_manual_20.pdf', defaultSelected: true },
    { section: '구조', title: 'J1900 구조·명칭', imageUrl: '/catalog-pages/man_j1900_struct.webp', pdfFile: '/manuals/space_manual_18.pdf', defaultSelected: true },
    { section: '조작', title: 'J1900 조작부', imageUrl: '/catalog-pages/man_j1900_ctrl.webp', pdfFile: '/manuals/space_manual_18.pdf', defaultSelected: true },
    { section: '비교', title: 'JC 사양 비교표', imageUrl: '/catalog-pages/jc_compare_spec.webp', pdfFile: '/manuals/space_manual_20.pdf', defaultSelected: false },
  ],
  'J1900CAR': [
    { section: '제원', title: 'J1900CAR 카탈로그', imageUrl: '/catalog-pages/jc_j1900car_spec.webp', pdfFile: '/manuals/space_manual_20.pdf', defaultSelected: true },
    { section: '구조', title: 'J1900CAR 구조·명칭', imageUrl: '/catalog-pages/man_j1900car_struct.webp', pdfFile: '/manuals/space_manual_19.pdf', defaultSelected: true },
    { section: '조작', title: 'J1900CAR 조작부', imageUrl: '/catalog-pages/man_j1900car_ctrl.webp', pdfFile: '/manuals/space_manual_19.pdf', defaultSelected: true },
    { section: '비교', title: 'JC 사양 비교표', imageUrl: '/catalog-pages/jc_compare_spec.webp', pdfFile: '/manuals/space_manual_20.pdf', defaultSelected: false },
  ],
  'R3 SCP': [
    { section: '제원', title: 'R3 SCP 카탈로그', imageUrl: '/catalog-pages/sp_r3scp_spec.webp', pdfFile: '/manuals/space_manual_21.pdf', defaultSelected: true },
    { section: '구조', title: 'R3 SCP 구조·제원', imageUrl: '/catalog-pages/man_r3scp_struct.webp', pdfFile: '/manuals/space_manual_21.pdf', defaultSelected: true },
  ],
  'R3 VAC': [
    { section: '제원', title: 'R3 VAC 카탈로그', imageUrl: '/catalog-pages/sp_r3vac_spec.webp', pdfFile: '/manuals/space_manual_22.pdf', defaultSelected: true },
    { section: '구조', title: 'R3 VAC 구조·제원', imageUrl: '/catalog-pages/man_r3vac_struct.webp', pdfFile: '/manuals/space_manual_22.pdf', defaultSelected: true },
  ],
  'Sparky': [
    { section: '제원', title: 'Sparky 카탈로그', imageUrl: '/catalog-pages/sp_sparky_spec.webp', pdfFile: '/manuals/space_manual_24.pdf', defaultSelected: true },
    { section: '구조', title: 'Sparky 구조·제원', imageUrl: '/catalog-pages/man_sparky_struct.webp', pdfFile: '/manuals/space_manual_24.pdf', defaultSelected: true },
  ],
};

export function resolveModelKey(rawModel?: string): string {
  const m = (rawModel || '').trim();
  if (!m) return 'S7P';
  const upper = m.toUpperCase().replace(/\s+/g, '');

  if (upper.includes('NEWS7') || upper.includes('신형S7')) return 'The New S7P';
  if (upper.includes('S7')) return 'S7P';
  if (upper.includes('S5')) return 'S5';
  if (upper.includes('S3MINI') || upper.includes('S3미니')) return 'S3mini';
  if (upper.includes('S3')) return 'S3';
  if (upper.includes('S2') || upper.includes('S1')) return 'S2';
  if (upper.includes('S16')) return 'S16P';
  if (upper.includes('S12')) return 'S12';
  if (upper.includes('W15')) return 'W15';
  if (upper.includes('W12')) return 'W12';
  if (upper.includes('쓰담') || upper.includes('SSDAM')) return '쓰담';
  if (upper.includes('플로어') || upper.includes('FLOOR')) return '플로어닥터';
  if (upper.includes('오비트') || upper.includes('ORBIT')) return '닥터오비트';
  if (upper.includes('J1900CAR') || upper.includes('19CAR')) return 'J1900CAR';
  if (upper.includes('J1900') || upper.includes('JINCLEAN19')) return 'J1900';
  if (upper.includes('J1300') || upper.includes('JINCLEAN13')) return 'J1300';
  if (upper.includes('J900') || upper.includes('JINCLEAN9')) return 'J900';
  if (upper.includes('J800') || upper.includes('JINCLEAN8')) return 'J800';
  if (upper.includes('J700') || upper.includes('JINCLEAN7')) return 'J700';
  if (upper.includes('J600') || upper.includes('JINCLEAN6')) return 'J600';
  if (upper.includes('R3VAC')) return 'R3 VAC';
  if (upper.includes('R3')) return 'R3 SCP';
  if (upper.includes('SPARKY') || upper.includes('스파키')) return 'Sparky';

  return 'S7P';
}

export function getModelCatalogBundle(rawModel?: string): ModelCatalogBundle {
  const modelKey = resolveModelKey(rawModel);
  const rawCards = RAW_VISUAL_MAP[modelKey] || RAW_VISUAL_MAP['S7P'];
  const visualCards: CatalogVisualCard[] = rawCards.map((c, idx) => ({
    ...c,
    id: `${modelKey}-vis-${idx}`,
    model: modelKey,
  }));

  const aliases = new Set<string>([modelKey.toUpperCase()]);
  if (modelKey === 'S7P' || modelKey === 'The New S7P') {
    aliases.add('S7');
    aliases.add('S7P');
    aliases.add('THE NEW S7P');
  } else if (modelKey === 'S3') {
    aliases.add('S3P');
  } else if (modelKey === 'J600') {
    aliases.add('J600T');
  }

  // Model-specific parts sorted by specificity (fewest applicable_models first, universal supplies last)
  const matchedParts = SPACE_DUST_OFFICIAL_CATALOG.filter(
    item =>
      item.applicable_models.some(am => aliases.has(am.toUpperCase())) ||
      item.applicable_models.some(am => am.includes('전 기종'))
  ).sort((a, b) => a.applicable_models.length - b.applicable_models.length);

  const manuals = SPACE_DUST_OFFICIAL_MANUALS.filter(man =>
    man.applicable_models.some(am => aliases.has(am.toUpperCase()))
  ).sort((a, b) => a.applicable_models.length - b.applicable_models.length);

  const lineup: 'SP' | 'JC' | 'ROBOT' = modelKey.startsWith('J')
    ? 'JC'
    : modelKey.startsWith('R3') || modelKey === 'Sparky'
      ? 'ROBOT'
      : 'SP';

  return {
    modelKey,
    label: modelKey,
    lineup,
    visualCards,
    parts: matchedParts,
    manuals,
  };
}
