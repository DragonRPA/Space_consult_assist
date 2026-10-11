import os

def apply_detail_studio_theme():
    path = 'frontend/apps/desktop/src/CounselAssistV2.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Remove background-image paper-texture from root to eliminate noisy grain
    old_root = "backgroundColor: 'var(--bg-app)', backgroundImage: 'var(--paper-texture)', backgroundRepeat: 'repeat', overflow: 'hidden'"
    new_root = "backgroundColor: 'var(--bg-app)', overflow: 'hidden'"
    if old_root in content:
        content = content.replace(old_root, new_root)
        print("1. Root container cleaned.")

    # 2. Left panel top card (line 1356): smooth #f5f2eb without noisy texture
    old_lp_top = "background: '#f5f2eb', backgroundImage: 'var(--paper-texture)', backgroundRepeat: 'repeat', borderRadius: 8, border: '1px solid #dcd5c9', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, position: 'relative', zIndex: 50, boxShadow: '0 1px 2px rgba(40,30,20,0.05)'"
    new_lp_top = "background: '#f5f2eb', borderRadius: 8, border: '1px solid #dcd5c9', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, position: 'relative', zIndex: 50, boxShadow: '0 1px 2px rgba(40,30,20,0.05)'"
    if old_lp_top in content:
        content = content.replace(old_lp_top, new_lp_top)
        print("2. Left panel top card cleaned.")

    # 3. Left panel bottom card (line 1673): smooth #f5f2eb without noisy texture
    old_lp_btm = "flex: 1, background: '#f5f2eb', backgroundImage: 'var(--paper-texture)', backgroundRepeat: 'repeat', borderRadius: 8, border: '1px solid #dcd5c9', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 1px 2px rgba(40,30,20,0.05)'"
    new_lp_btm = "flex: 1, background: '#f5f2eb', borderRadius: 8, border: '1px solid #dcd5c9', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 1px 2px rgba(40,30,20,0.05)'"
    if old_lp_btm in content:
        content = content.replace(old_lp_btm, new_lp_btm)
        print("3. Left panel bottom card cleaned.")

    # 4. Right panel title & tag: [우측 패널: 디테일 스튜디오]
    old_rp_header = "{/* ════════════════════════════════════════════════════════════════════════\n            [우측 패널 (Flex 1)] : 복수 증상 탭 바 + 실시간 진단 콘솔 + 통합 완결\n        ════════════════════════════════════════════════════════════════════════ */}\n        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, height: '100%', overflow: 'hidden' }}>"
    new_rp_header = "{/* ════════════════════════════════════════════════════════════════════════\n            [우측 패널: 디테일 스튜디오] : 복수 증상 탭 바 + 실시간 진단 콘솔 + 통합 완결\n        ════════════════════════════════════════════════════════════════════════ */}\n        <div data-testid=\"detail-studio\" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, height: '100%', overflow: 'hidden' }}>"
    if old_rp_header in content:
        content = content.replace(old_rp_header, new_rp_header)
        print("4. Detail studio header and testid updated.")

    # 5. Detail Studio Idle Waiting Card: exact #ece7de (subtoolbar color marked in blue by user)
    old_idle = """          {/* 증상 미선택 시 대기 화면 (고밀도 전문 가이드) */}
          {sessionList.length === 0 && !isLoadingPlan && (
            <div style={{
              flex: 1,
              background: '#f5f2eb',
              backgroundImage: 'var(--paper-texture)',
              backgroundRepeat: 'repeat',
              borderRadius: 8,
              border: '1px solid #dcd5c9',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px 24px',
              gap: 16,
              boxShadow: '0 1px 3px rgba(40,30,20,0.05)'
            }}>"""

    new_idle = """          {/* 증상 미선택 시 대기 화면 (고밀도 전문 가이드) - 디테일 스튜디오 */}
          {sessionList.length === 0 && !isLoadingPlan && (
            <div style={{
              flex: 1,
              background: '#ece7de',
              borderRadius: 8,
              border: '1px solid #dcd5c9',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px 24px',
              gap: 16,
              boxShadow: '0 1px 3px rgba(40,30,20,0.05)'
            }}>"""
    assert old_idle in content, "old_idle not found"
    content = content.replace(old_idle, new_idle)
    print("5. Detail studio idle card background set to #ece7de.")

    # 6. Idle card inner 3 guide boxes: background #f5f2eb (clean contrast on #ece7de desk)
    # The icon circle:
    content = content.replace(
        """              <div style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: '#ece7de',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #dcd5c9'
              }}>""",
        """              <div style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: '#f5f2eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #dcd5c9'
              }}>"""
    )
    print("6. Icon circle set to #f5f2eb.")

    # The 3 boxes:
    content = content.replace(
        "<div style={{ background: '#ece7de', border: '1px solid #dcd5c9', borderRadius: 6, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>\n                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 800, color: '#1e40af' }}>\n                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#dbeafe', color: '#1d4ed8', fontSize: 13.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>",
        "<div style={{ background: '#f5f2eb', border: '1px solid #dcd5c9', borderRadius: 6, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>\n                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 800, color: '#1e40af' }}>\n                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#dbeafe', color: '#1d4ed8', fontSize: 13.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>"
    )
    content = content.replace(
        "<div style={{ background: '#ece7de', border: '1px solid #dcd5c9', borderRadius: 6, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>\n                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 800, color: '#1e40af' }}>\n                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#dbeafe', color: '#1d4ed8', fontSize: 13.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</span>",
        "<div style={{ background: '#f5f2eb', border: '1px solid #dcd5c9', borderRadius: 6, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>\n                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 800, color: '#1e40af' }}>\n                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#dbeafe', color: '#1d4ed8', fontSize: 13.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</span>"
    )
    content = content.replace(
        "<div style={{ background: '#ece7de', border: '1px solid #dcd5c9', borderRadius: 6, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>\n                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 800, color: '#1e40af' }}>\n                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#dbeafe', color: '#1d4ed8', fontSize: 13.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</span>",
        "<div style={{ background: '#f5f2eb', border: '1px solid #dcd5c9', borderRadius: 6, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>\n                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 800, color: '#1e40af' }}>\n                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#dbeafe', color: '#1d4ed8', fontSize: 13.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</span>"
    )
    print("7. 3 guide boxes set to #f5f2eb.")

    # 8. Loading plan:
    content = content.replace(
        "flex: 1, background: '#f5f2eb', backgroundImage: 'var(--paper-texture)', backgroundRepeat: 'repeat', borderRadius: 8, border: '1px solid #dcd5c9', display: 'flex', flexDirection: 'column', alignItems: 'center'",
        "flex: 1, background: '#ece7de', borderRadius: 8, border: '1px solid #dcd5c9', display: 'flex', flexDirection: 'column', alignItems: 'center'"
    )

    # 9. Top tab bar:
    content = content.replace(
        "background: '#f5f2eb', backgroundImage: 'var(--paper-texture)', backgroundRepeat: 'repeat', borderRadius: 8, border: '1px solid #dcd5c9', padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'",
        "background: '#ece7de', borderRadius: 8, border: '1px solid #dcd5c9', padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'"
    )

    # 10. Active symptom header:
    content = content.replace(
        "background: '#f5f2eb', backgroundImage: 'var(--paper-texture)', backgroundRepeat: 'repeat', borderRadius: 8, border: '1px solid #dcd5c9', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, boxShadow: '0 1px 2px rgba(40,30,20,0.05)'",
        "background: '#ece7de', borderRadius: 8, border: '1px solid #dcd5c9', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, boxShadow: '0 1px 2px rgba(40,30,20,0.05)'"
    )

    # 11. Voltage/Alarm chips panel container:
    content = content.replace(
        "background: '#f5f2eb',\n                  borderRadius: 8,\n                  border: '1px solid #bfdbfe',",
        "background: '#ece7de',\n                  borderRadius: 8,\n                  border: '1px solid #dcd5c9',"
    )

    # 12. Step progress bar:
    content = content.replace(
        "background: '#f5f2eb', backgroundImage: 'var(--paper-texture)', backgroundRepeat: 'repeat', borderRadius: 8, border: '1px solid #dcd5c9', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0",
        "background: '#ece7de', borderRadius: 8, border: '1px solid #dcd5c9', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0"
    )

    # 13. Active step card:
    content = content.replace(
        "background: '#f5f2eb', backgroundImage: 'var(--paper-texture)', backgroundRepeat: 'repeat', borderRadius: 8, border: '1px solid #bfdbfe', padding: '12px 14px'",
        "background: '#ece7de', borderRadius: 8, border: '1px solid #dcd5c9', padding: '12px 14px'"
    )

    # 14. Step timeline summary card:
    content = content.replace(
        "background: '#f5f2eb', backgroundImage: 'var(--paper-texture)', backgroundRepeat: 'repeat', borderRadius: 8, border: '1px solid #dcd5c9', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6",
        "background: '#ece7de', borderRadius: 8, border: '1px solid #dcd5c9', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6"
    )

    # 15. Past cases card:
    content = content.replace(
        "background: '#f5f2eb', backgroundImage: 'var(--paper-texture)', backgroundRepeat: 'repeat', borderRadius: 8, border: '1px solid #dcd5c9', padding: '8px 14px'",
        "background: '#ece7de', borderRadius: 8, border: '1px solid #dcd5c9', padding: '8px 14px'"
    )

    # 16. Terminal action bar ( 우측 4구역 ):
    content = content.replace(
        "background: '#f5f2eb', backgroundImage: 'var(--paper-texture)', backgroundRepeat: 'repeat', borderRadius: 8, border: '1px solid #dcd5c9', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, boxShadow: '0 -1px 3px rgba(40,30,20,0.05)'",
        "background: '#ece7de', borderRadius: 8, border: '1px solid #dcd5c9', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, boxShadow: '0 -1px 3px rgba(40,30,20,0.05)'"
    )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS: CounselAssistV2.tsx updated with Detail Studio #ece7de theme!")

if __name__ == '__main__':
    apply_detail_studio_theme()
