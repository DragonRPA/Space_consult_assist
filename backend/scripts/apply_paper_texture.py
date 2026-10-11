import os

def update_counsel_assist_v2():
    path = 'frontend/apps/desktop/src/CounselAssistV2.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Top left card (line 1356)
    c1_old = "background: '#fbf9f5', borderRadius: 8, border: '1px solid #dcd5c9', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, position: 'relative', zIndex: 50, boxShadow: '0 1px 2px rgba(40,30,20,0.05)'"
    c1_new = "background: '#f5f2eb', backgroundImage: 'var(--paper-texture)', backgroundRepeat: 'repeat', borderRadius: 8, border: '1px solid #dcd5c9', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, position: 'relative', zIndex: 50, boxShadow: '0 1px 2px rgba(40,30,20,0.05)'"
    assert c1_old in content, "c1_old not found"
    content = content.replace(c1_old, c1_new)

    # 2. Bottom left card (line 1673)
    c2_old = "flex: 1, background: '#fbf9f5', borderRadius: 8, border: '1px solid #dcd5c9', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 1px 2px rgba(40,30,20,0.05)'"
    c2_new = "flex: 1, background: '#f5f2eb', backgroundImage: 'var(--paper-texture)', backgroundRepeat: 'repeat', borderRadius: 8, border: '1px solid #dcd5c9', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 1px 2px rgba(40,30,20,0.05)'"
    assert c2_old in content, "c2_old not found"
    content = content.replace(c2_old, c2_new)

    # 3. Center empty card (line 1928)
    c3_old = "flex: 1,\n              background: '#fbf9f5',"
    c3_new = "flex: 1,\n              background: '#f5f2eb',\n              backgroundImage: 'var(--paper-texture)',\n              backgroundRepeat: 'repeat',"
    assert c3_old in content, "c3_old not found"
    content = content.replace(c3_old, c3_new)

    # 4. Loading card (line 1995)
    c4_old = "flex: 1, background: '#fbf9f5', borderRadius: 8, border: '1px solid #dcd5c9', display: 'flex', flexDirection: 'column', alignItems: 'center'"
    c4_new = "flex: 1, background: '#f5f2eb', backgroundImage: 'var(--paper-texture)', backgroundRepeat: 'repeat', borderRadius: 8, border: '1px solid #dcd5c9', display: 'flex', flexDirection: 'column', alignItems: 'center'"
    assert c4_old in content, "c4_old not found"
    content = content.replace(c4_old, c4_new)

    # 5. Right top tab bar (line 2006)
    c5_old = "background: '#fbf9f5', borderRadius: 8, border: '1px solid #dcd5c9', padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'"
    c5_new = "background: '#f5f2eb', backgroundImage: 'var(--paper-texture)', backgroundRepeat: 'repeat', borderRadius: 8, border: '1px solid #dcd5c9', padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'"
    assert c5_old in content, "c5_old not found"
    content = content.replace(c5_old, c5_new)

    # 6. Active symptom header (line 2110)
    c6_old = "background: '#fbf9f5', borderRadius: 8, border: '1px solid #dcd5c9', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, boxShadow: '0 1px 2px rgba(40,30,20,0.05)'"
    c6_new = "background: '#f5f2eb', backgroundImage: 'var(--paper-texture)', backgroundRepeat: 'repeat', borderRadius: 8, border: '1px solid #dcd5c9', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, boxShadow: '0 1px 2px rgba(40,30,20,0.05)'"
    assert c6_old in content, "c6_old not found"
    content = content.replace(c6_old, c6_new)

    # 7. Step progress bar (line 2447)
    c7_old = "background: '#fbf9f5', borderRadius: 8, border: '1px solid #dcd5c9', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0"
    c7_new = "background: '#f5f2eb', backgroundImage: 'var(--paper-texture)', backgroundRepeat: 'repeat', borderRadius: 8, border: '1px solid #dcd5c9', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0"
    assert c7_old in content, "c7_old not found"
    content = content.replace(c7_old, c7_new)

    # 8. Step active card (line 2509)
    c8_old = "background: '#fbf9f5', borderRadius: 8, border: '1px solid #bfdbfe', padding: '12px 14px'"
    c8_new = "background: '#f5f2eb', backgroundImage: 'var(--paper-texture)', backgroundRepeat: 'repeat', borderRadius: 8, border: '1px solid #bfdbfe', padding: '12px 14px'"
    assert c8_old in content, "c8_old not found"
    content = content.replace(c8_old, c8_new)

    # 9. Part inspect card (line 2642)
    c9_old = "background: '#fbf9f5', borderRadius: 8, border: '1px solid #dcd5c9', padding: '10px 14px'"
    c9_new = "background: '#f5f2eb', backgroundImage: 'var(--paper-texture)', backgroundRepeat: 'repeat', borderRadius: 8, border: '1px solid #dcd5c9', padding: '10px 14px'"
    assert c9_old in content, "c9_old not found"
    content = content.replace(c9_old, c9_new)

    # 10. Past cases card (line 2692)
    c10_old = "background: '#fbf9f5', borderRadius: 8, border: '1px solid #dcd5c9', padding: '8px 14px'"
    c10_new = "background: '#f5f2eb', backgroundImage: 'var(--paper-texture)', backgroundRepeat: 'repeat', borderRadius: 8, border: '1px solid #dcd5c9', padding: '8px 14px'"
    assert c10_old in content, "c10_old not found"
    content = content.replace(c10_old, c10_new)

    # 11. Final decision card (line 2730)
    c11_old = "background: '#fbf9f5', borderRadius: 8, border: '1px solid #dcd5c9', padding: '8px 12px'"
    c11_new = "background: '#f5f2eb', backgroundImage: 'var(--paper-texture)', backgroundRepeat: 'repeat', borderRadius: 8, border: '1px solid #dcd5c9', padding: '8px 12px'"
    assert c11_old in content, "c11_old not found"
    content = content.replace(c11_old, c11_new)

    # Inner 3 guide cards in empty state: change to #ece7de for subtle contrast
    content = content.replace(
        "<div style={{ background: '#f5f2eb', border: '1px solid #dcd5c9', borderRadius: 6, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>",
        "<div style={{ background: '#ece7de', border: '1px solid #dcd5c9', borderRadius: 6, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>"
    )

    # Hover leaves
    content = content.replace("e.currentTarget.style.background = '#fbf9f5'", "e.currentTarget.style.background = '#f5f2eb'")

    # Replace all remaining #fbf9f5 with #f5f2eb
    content = content.replace('#fbf9f5', '#f5f2eb')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("CounselAssistV2.tsx updated.")

def update_counsel_compare():
    path = 'frontend/apps/desktop/src/CounselCompare.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Query box (line 143)
    c_old = "<div style={{ background: '#fbf9f5', borderRadius: 8, border: '1px solid #dcd5c9', padding: 16, boxShadow: '0 1px 3px rgba(40,30,20,0.05)' }}>"
    c_new = "<div style={{ background: '#f5f2eb', backgroundImage: 'var(--paper-texture)', backgroundRepeat: 'repeat', borderRadius: 8, border: '1px solid #dcd5c9', padding: 16, boxShadow: '0 1px 3px rgba(40,30,20,0.05)' }}>"
    assert c_old in content, "CounselCompare c_old not found"
    content = content.replace(c_old, c_new)

    # Replace all remaining #fbf9f5 with #f5f2eb
    content = content.replace('#fbf9f5', '#f5f2eb')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("CounselCompare.tsx updated.")

def update_schedule_page():
    path = 'frontend/apps/desktop/src/SchedulePage.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Sidebar: background: '#fbf9f5' -> background: '#ece7de' (binder tone)
    sb_old = "<aside style={{ width: 240, flexShrink: 0, background: '#fbf9f5', borderRight: '1px solid #dcd5c9', padding: 14, overflowY: 'auto' }}>"
    sb_new = "<aside style={{ width: 240, flexShrink: 0, background: '#ece7de', borderRight: '1px solid #dcd5c9', padding: 14, overflowY: 'auto' }}>"
    assert sb_old in content, "SchedulePage sb_old not found"
    content = content.replace(sb_old, sb_new)

    # Calendar main card (line 221)
    cal_old = "background: '#fbf9f5', border: '1px solid #dcd5c9', borderRadius: 8, overflow: 'hidden',"
    cal_new = "background: '#f5f2eb', backgroundImage: 'var(--paper-texture)', backgroundRepeat: 'repeat', border: '1px solid #dcd5c9', borderRadius: 8, overflow: 'hidden',"
    assert cal_old in content, "SchedulePage cal_old not found"
    content = content.replace(cal_old, cal_new)

    # Today/cell styling in calendar
    content = content.replace("isToday ? '#f5f2eb' : '#fbf9f5'", "isToday ? '#ece7de' : '#f5f2eb'")

    # Timeline card (line 293)
    tl_old = "<div style={{ background: '#fbf9f5', border: '1px solid #dcd5c9', borderRadius: 8, minHeight: 400, padding: 16 }}>"
    tl_new = "<div style={{ background: '#f5f2eb', backgroundImage: 'var(--paper-texture)', backgroundRepeat: 'repeat', border: '1px solid #dcd5c9', borderRadius: 8, minHeight: 400, padding: 16 }}>"
    assert tl_old in content, "SchedulePage tl_old not found"
    content = content.replace(tl_old, tl_new)

    # All remaining #fbf9f5 -> #f5f2eb
    content = content.replace('#fbf9f5', '#f5f2eb')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("SchedulePage.tsx updated.")

def update_modals():
    for fpath in ['frontend/apps/desktop/src/EventFormModal.tsx', 'frontend/apps/desktop/src/EventDetailModal.tsx']:
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Modal dialog backgrounds
        content = content.replace("background: '#fbf9f5', borderRadius: 10,", "background: '#f5f2eb', backgroundImage: 'var(--paper-texture)', backgroundRepeat: 'repeat', borderRadius: 10,")
        content = content.replace('#fbf9f5', '#f5f2eb')

        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"{fpath} updated.")

if __name__ == '__main__':
    update_counsel_assist_v2()
    update_counsel_compare()
    update_schedule_page()
    update_modals()
    print("ALL FILES UPDATED WITH WARM PAPER TEXTURE!")
