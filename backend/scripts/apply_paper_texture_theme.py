import re

def update_counsel_assist_v2():
    path = "frontend/apps/desktop/src/CounselAssistV2.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Main outer wrapper background
    content = content.replace(
        "background: '#f8fafc', overflow: 'hidden' }}>",
        "backgroundColor: 'var(--bg-app)', backgroundImage: 'var(--paper-texture)', backgroundRepeat: 'repeat', overflow: 'hidden' }}>"
    )

    # 2. Subtoolbar background
    content = content.replace(
        "background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '0 16px', display: 'flex', alignItems: 'center', height: 46",
        "background: '#ece7de', borderBottom: '1px solid #dcd5c9', padding: '0 16px', display: 'flex', alignItems: 'center', height: 46"
    )

    # 3. Subtoolbar buttons & dividers
    content = content.replace(
        "background: pendingSessions.length > 0 ? '#fffbeb' : '#ffffff',",
        "background: pendingSessions.length > 0 ? '#fffbeb' : '#fbf9f5',"
    )
    content = content.replace(
        "border: pendingSessions.length > 0 ? '1px solid #fde68a' : '1px solid #e2e8f0',",
        "border: pendingSessions.length > 0 ? '1px solid #fde68a' : '1px solid #dcd5c9',"
    )
    content = content.replace(
        "background: '#ffffff',\n            color: '#334155',\n            border: '1px solid #e2e8f0',",
        "background: '#fbf9f5',\n            color: '#334155',\n            border: '1px solid #dcd5c9',"
    )
    content = content.replace(
        "<div style={{ width: 1, height: 18, background: '#e2e8f0' }} />",
        "<div style={{ width: 1, height: 18, background: '#dcd5c9' }} />"
    )
    content = content.replace(
        "outline: 'none', background: '#fff' }}",
        "outline: 'none', background: '#fbf9f5', border: '1px solid #dcd5c9' }}"
    )
    content = content.replace(
        "background: '#fff', border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 10px', fontSize: 13.5, fontWeight: 600, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap', height: 28",
        "background: '#fbf9f5', border: '1px solid #dcd5c9', borderRadius: 4, padding: '2px 10px', fontSize: 13.5, fontWeight: 600, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap', height: 28"
    )

    # 4. Left panel card 1 (Equipment & customer)
    content = content.replace(
        "<div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, position: 'relative', zIndex: 50, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>",
        "<div style={{ background: '#fbf9f5', borderRadius: 8, border: '1px solid #dcd5c9', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, position: 'relative', zIndex: 50, boxShadow: '0 1px 2px rgba(40,30,20,0.05)' }}>"
    )
    content = content.replace(
        "border: isActive ? '1px solid #0f172a' : '1px solid #e2e8f0',\n                        background: isActive ? '#0f172a' : '#f8fafc',",
        "border: isActive ? '1px solid #0f172a' : '1px solid #dcd5c9',\n                        background: isActive ? '#0f172a' : '#f5f2eb',"
    )
    content = content.replace(
        "background: '#f8fafc',\n                    border: '1px solid #bfdbfe',",
        "background: '#f5f2eb',\n                    border: '1px solid #bfdbfe',"
    )
    content = content.replace(
        "borderBottom: '1px solid #e2e8f0', paddingBottom: 4",
        "borderBottom: '1px solid #dcd5c9', paddingBottom: 4"
    )
    content = content.replace(
        "border: '1px solid #cbd5e1', borderRadius: 5, fontSize: 13.5, outline: 'none', boxSizing: 'border-box', background: '#fff' }}",
        "border: '1px solid #dcd5c9', borderRadius: 5, fontSize: 13.5, outline: 'none', boxSizing: 'border-box', background: '#fbf9f5' }}"
    )
    content = content.replace(
        "background: '#ffffff', border: '1px solid #3b82f6', borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.15)'",
        "background: '#fbf9f5', border: '1px solid #1d4ed8', borderRadius: 6, boxShadow: '0 8px 24px rgba(40,30,20,0.15)'"
    )
    content = content.replace(
        "borderBottom: '1px solid #f1f5f9', fontSize: 13.5 }}",
        "borderBottom: '1px solid #e8e2d8', fontSize: 13.5 }}"
    )
    content = content.replace(
        "onMouseLeave={e => (e.currentTarget.style.background = '#fff')}",
        "onMouseLeave={e => (e.currentTarget.style.background = '#fbf9f5')}"
    )
    content = content.replace(
        "border: '1px solid #cbd5e1',\n                    borderRadius: 5,\n                    padding: '0 24px 0 8px',\n                    fontSize: 13.5,\n                    outline: 'none',\n                    background: '#fff',",
        "border: '1px solid #dcd5c9',\n                    borderRadius: 5,\n                    padding: '0 24px 0 8px',\n                    fontSize: 13.5,\n                    outline: 'none',\n                    background: '#fbf9f5',"
    )

    # 5. Left panel card 2 (Category & search)
    content = content.replace(
        "<div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>",
        "<div style={{ background: '#fbf9f5', borderRadius: 8, border: '1px solid #dcd5c9', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, boxShadow: '0 1px 2px rgba(40,30,20,0.05)' }}>"
    )
    content = content.replace(
        "border: isCatActive ? '1px solid #93c5fd' : '1px solid #e2e8f0',\n                      background: isCatActive ? '#eff6ff' : '#f8fafc',",
        "border: isCatActive ? '1px solid #bfdbfe' : '1px solid #dcd5c9',\n                      background: isCatActive ? '#eff6ff' : '#f5f2eb',"
    )
    content = content.replace(
        "border: '1px solid #cbd5e1', borderRadius: 5, padding: '0 8px', fontSize: 13.5, outline: 'none', background: '#fff' }}",
        "border: '1px solid #dcd5c9', borderRadius: 5, padding: '0 8px', fontSize: 13.5, outline: 'none', background: '#fbf9f5' }}"
    )
    content = content.replace(
        "background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 5, padding: '0 10px', height: 32, color: '#2563eb', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}",
        "background: '#fbf9f5', border: '1px solid #dcd5c9', borderRadius: 5, padding: '0 10px', height: 32, color: '#1d4ed8', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}"
    )
    content = content.replace(
        "borderTop: '1px dashed #e2e8f0' }}>",
        "borderTop: '1px dashed #dcd5c9' }}>"
    )
    content = content.replace(
        "border: '1px solid #cbd5e1', borderRadius: 5, padding: '0 8px', fontSize: 13.5, outline: 'none' }}",
        "border: '1px solid #dcd5c9', borderRadius: 5, padding: '0 8px', fontSize: 13.5, outline: 'none', background: '#fbf9f5' }}"
    )

    # 6. Left panel card 3 (Standard symptom list)
    content = content.replace(
        "<div style={{ flex: 1, background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>",
        "<div style={{ flex: 1, background: '#fbf9f5', borderRadius: 8, border: '1px solid #dcd5c9', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 1px 2px rgba(40,30,20,0.05)' }}>"
    )
    content = content.replace(
        "<div style={{ padding: '7px 10px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>",
        "<div style={{ padding: '7px 10px', background: '#ece7de', borderBottom: '1px solid #dcd5c9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>"
    )
    content = content.replace(
        ": '1px solid #e2e8f0',\n                        background: isCurrentActive\n                          ? '#eff6ff'\n                          : existingSession\n                          ? '#f8fafc'\n                          : '#ffffff',",
        ": '1px solid #dcd5c9',\n                        background: isCurrentActive\n                          ? '#eff6ff'\n                          : existingSession\n                          ? '#f5f2eb'\n                          : '#fbf9f5',"
    )
    content = content.replace(
        "onMouseEnter={e => { if (!isCurrentActive) e.currentTarget.style.background = '#f8fafc'; }}\n                      onMouseLeave={e => { if (!isCurrentActive && !existingSession) e.currentTarget.style.background = '#ffffff'; }}",
        "onMouseEnter={e => { if (!isCurrentActive) e.currentTarget.style.background = '#f5f2eb'; }}\n                      onMouseLeave={e => { if (!isCurrentActive && !existingSession) e.currentTarget.style.background = '#fbf9f5'; }}"
    )
    content = content.replace(
        "background: preset.urgency === '긴급' ? '#fef2f2' : '#f8fafc',\n                            color: preset.urgency === '긴급' ? '#dc2626' : '#64748b',\n                            border: preset.urgency === '긴급' ? '1px solid #fecaca' : '1px solid #e2e8f0'",
        "background: preset.urgency === '긴급' ? '#fef2f2' : '#f5f2eb',\n                            color: preset.urgency === '긴급' ? '#dc2626' : '#64748b',\n                            border: preset.urgency === '긴급' ? '1px solid #fecaca' : '1px solid #dcd5c9'"
    )

    # 7. Special guides banner in right panel
    content = content.replace(
        "background: '#ffffff',\n                border: '1px solid #bfdbfe',\n                borderRadius: 8,\n                padding: '8px 12px',",
        "background: '#fbf9f5',\n                border: '1px solid #bfdbfe',\n                borderRadius: 8,\n                padding: '8px 12px',"
    )
    content = content.replace(
        "borderBottom: '1px solid #f1f5f9', paddingBottom: 4",
        "borderBottom: '1px solid #e8e2d8', paddingBottom: 4"
    )
    content = content.replace(
        "background: isCurrent ? '#eff6ff' : '#f8fafc',\n                        color: isCurrent ? '#1d4ed8' : '#475569',\n                        border: isCurrent ? '1px solid #2563eb' : '1px solid #e2e8f0',",
        "background: isCurrent ? '#eff6ff' : '#f5f2eb',\n                        color: isCurrent ? '#1d4ed8' : '#475569',\n                        border: isCurrent ? '1px solid #1d4ed8' : '1px solid #dcd5c9',"
    )
    content = content.replace(
        "<div style={{ background: '#f8fafc', borderRadius: 6, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5, border: '1px solid #e2e8f0' }}>",
        "<div style={{ background: '#f5f2eb', borderRadius: 6, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5, border: '1px solid #dcd5c9' }}>"
    )
    content = content.replace(
        "background: '#ffffff',\n                          border: '1px solid #93c5fd',",
        "background: '#fbf9f5',\n                          border: '1px solid #bfdbfe',"
    )

    # 8. Empty symptom state card (Right panel center)
    content = content.replace(
        "background: '#ffffff',\n              borderRadius: 8,\n              border: '1px solid #e2e8f0',\n              display: 'flex',\n              flexDirection: 'column',\n              alignItems: 'center',\n              justifyContent: 'center',\n              padding: '32px 24px',\n              gap: 16",
        "background: '#fbf9f5',\n              borderRadius: 8,\n              border: '1px solid #dcd5c9',\n              display: 'flex',\n              flexDirection: 'column',\n              alignItems: 'center',\n              justifyContent: 'center',\n              padding: '32px 24px',\n              gap: 16,\n              boxShadow: '0 1px 3px rgba(40,30,20,0.05)'"
    )
    content = content.replace(
        "background: '#f1f5f9',\n                display: 'flex',\n                alignItems: 'center',\n                justifyContent: 'center',\n                border: '1px solid #e2e8f0'",
        "background: '#ece7de',\n                display: 'flex',\n                alignItems: 'center',\n                justifyContent: 'center',\n                border: '1px solid #dcd5c9'"
    )
    # The 3 step cards inside empty state
    content = content.replace(
        "<div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>",
        "<div style={{ background: '#f5f2eb', border: '1px solid #dcd5c9', borderRadius: 6, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>"
    )

    # 9. Active symptom session tab bar
    content = content.replace(
        "<div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexShrink: 0 }}>",
        "<div style={{ background: '#fbf9f5', borderRadius: 8, border: '1px solid #dcd5c9', padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexShrink: 0 }}>"
    )
    content = content.replace(
        ": '1px solid #e2e8f0',\n                          borderBottom: isCurrent ? '2px solid #2563eb' : undefined,\n                          background: isCurrent\n                            ? '#eff6ff'\n                            : isResolved\n                            ? '#ecfdf5'\n                            : isFault\n                            ? '#fef2f2'\n                            : '#ffffff',",
        ": '1px solid #dcd5c9',\n                          borderBottom: isCurrent ? '2px solid #1d4ed8' : undefined,\n                          background: isCurrent\n                            ? '#eff6ff'\n                            : isResolved\n                            ? '#ecfdf5'\n                            : isFault\n                            ? '#fef2f2'\n                            : '#fbf9f5',"
    )

    # 10. Active symptom header card
    content = content.replace(
        "<div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>",
        "<div style={{ background: '#fbf9f5', borderRadius: 8, border: '1px solid #dcd5c9', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, boxShadow: '0 1px 2px rgba(40,30,20,0.05)' }}>"
    )
    content = content.replace(
        "background: '#f1f5f9', color: '#475569', fontWeight: 600, border: '1px solid #e2e8f0'",
        "background: '#ece7de', color: '#475569', fontWeight: 600, border: '1px solid #dcd5c9'"
    )
    content = content.replace(
        "background: currentSession.urgency === '긴급' ? '#fef2f2' : '#f8fafc',\n                      color: currentSession.urgency === '긴급' ? '#dc2626' : '#64748b',\n                      fontWeight: 700,\n                      border: currentSession.urgency === '긴급' ? '1px solid #fecaca' : '1px solid #e2e8f0'",
        "background: currentSession.urgency === '긴급' ? '#fef2f2' : '#f5f2eb',\n                      color: currentSession.urgency === '긴급' ? '#dc2626' : '#64748b',\n                      fontWeight: 700,\n                      border: currentSession.urgency === '긴급' ? '1px solid #fecaca' : '1px solid #dcd5c9'"
    )
    content = content.replace(
        "<div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>",
        "<div style={{ background: '#f5f2eb', border: '1px solid #dcd5c9', borderRadius: 6, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>"
    )

    # 11. Error code console
    content = content.replace(
        "background: '#f8fafc',\n                  borderRadius: 8,\n                  border: '1px solid #bfdbfe',",
        "background: '#f5f2eb',\n                  borderRadius: 8,\n                  border: '1px solid #bfdbfe',"
    )
    content = content.replace(
        "background: '#ffffff',\n                        border: '1px solid #cbd5e1',\n                        borderRadius: 5,\n                        padding: '3px 8px',",
        "background: '#fbf9f5',\n                        border: '1px solid #dcd5c9',\n                        borderRadius: 5,\n                        padding: '3px 8px',"
    )
    content = content.replace(
        ": '1px solid #e2e8f0',\n                              background: isSelected\n                                ? '#1d4ed8'\n                                : '#ffffff',",
        ": '1px solid #dcd5c9',\n                              background: isSelected\n                                ? '#1d4ed8'\n                                : '#fbf9f5',"
    )
    content = content.replace(
        "<div style={{\n                      background: '#ffffff',\n                      border: currentSession.selectedErrorCode.resolution_type === 'VISIT_REQUIRED' ? '1px solid #fca5a5' : '1px solid #86efac',",
        "<div style={{\n                      background: '#fbf9f5',\n                      border: currentSession.selectedErrorCode.resolution_type === 'VISIT_REQUIRED' ? '1px solid #fca5a5' : '1px solid #86efac',"
    )
    content = content.replace(
        "background: '#ffffff',\n                            border: '1px solid #cbd5e1',",
        "background: '#fbf9f5',\n                            border: '1px solid #dcd5c9',"
    )
    content = content.replace(
        "background: '#f8fafc',\n                        border: '1px solid #cbd5e1',",
        "background: '#f5f2eb',\n                        border: '1px solid #dcd5c9',"
    )

    # 12. Steps navigation bar
    content = content.replace(
        "<div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>",
        "<div style={{ background: '#fbf9f5', borderRadius: 8, border: '1px solid #dcd5c9', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>"
    )
    content = content.replace(
        ": '1px solid #e2e8f0',\n                          background: isSelected\n                            ? '#eff6ff'\n                            : isResolved\n                            ? '#f0fdf4'\n                            : isUnresolved\n                            ? '#fef2f2'\n                            : '#ffffff',",
        ": '1px solid #dcd5c9',\n                          background: isSelected\n                            ? '#eff6ff'\n                            : isResolved\n                            ? '#f0fdf4'\n                            : isUnresolved\n                            ? '#fef2f2'\n                            : '#fbf9f5',"
    )

    # 13. Active Step diagnosis card
    content = content.replace(
        "<div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #93c5fd', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 1px 3px rgba(37,99,235,0.06)' }}>",
        "<div style={{ background: '#fbf9f5', borderRadius: 8, border: '1px solid #bfdbfe', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 1px 3px rgba(40,30,20,0.05)' }}>"
    )
    content = content.replace(
        "borderBottom: '1px solid #f1f5f9', paddingBottom: 6",
        "borderBottom: '1px solid #e8e2d8', paddingBottom: 6"
    )
    content = content.replace(
        "<div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: '#f8fafc', padding: '10px 14px', borderRadius: 6, border: '1px solid #cbd5e1' }}>",
        "<div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: '#f5f2eb', padding: '10px 14px', borderRadius: 6, border: '1px solid #dcd5c9' }}>"
    )

    # 14. Step checklist summary
    content = content.replace(
        "<div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>",
        "<div style={{ background: '#fbf9f5', borderRadius: 8, border: '1px solid #dcd5c9', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>"
    )
    content = content.replace(
        "border: idx === currentSession.activeStepIndex ? '1px solid #2563eb' : '1px solid #e2e8f0',\n                          background: idx === currentSession.activeStepIndex ? '#eff6ff' : '#f8fafc',",
        "border: idx === currentSession.activeStepIndex ? '1px solid #1d4ed8' : '1px solid #dcd5c9',\n                          background: idx === currentSession.activeStepIndex ? '#eff6ff' : '#f5f2eb',"
    )
    content = content.replace(
        "background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '2px 7px', borderRadius: 3",
        "background: '#ece7de', border: '1px solid #dcd5c9', padding: '2px 7px', borderRadius: 3"
    )

    # 15. Similar cases & Terminal action bar
    content = content.replace(
        "<div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>",
        "<div style={{ background: '#fbf9f5', borderRadius: 8, border: '1px solid #dcd5c9', padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>"
    )
    content = content.replace(
        "border: '1px solid #cbd5e1', borderRadius: 5, padding: '6px 9px', background: '#f8fafc', fontSize: 13.5",
        "border: '1px solid #dcd5c9', borderRadius: 5, padding: '6px 9px', background: '#f5f2eb', fontSize: 13.5"
    )
    content = content.replace(
        "<div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #cbd5e1', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, boxShadow: '0 -1px 3px rgba(0,0,0,0.03)' }}>",
        "<div style={{ background: '#fbf9f5', borderRadius: 8, border: '1px solid #dcd5c9', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, boxShadow: '0 -1px 3px rgba(40,30,20,0.05)' }}>"
    )
    content = content.replace(
        "border: '1px solid #cbd5e1', borderRadius: 5, padding: '4px 10px', fontSize: 13.5, outline: 'none', height: 34, boxSizing: 'border-box', background: '#ffffff', transition: 'border-color 0.15s ease'",
        "border: '1px solid #dcd5c9', borderRadius: 5, padding: '4px 10px', fontSize: 13.5, outline: 'none', height: 34, boxSizing: 'border-box', background: '#fbf9f5', transition: 'border-color 0.15s ease'"
    )
    content = content.replace(
        "background: overallStatus === 'resolved_by_call' ? '#059669' : '#f8fafc',\n                    color: overallStatus === 'resolved_by_call' ? '#ffffff' : '#475569',\n                    border: overallStatus === 'resolved_by_call' ? '1px solid #047857' : '1px solid #cbd5e1',",
        "background: overallStatus === 'resolved_by_call' ? '#059669' : '#f5f2eb',\n                    color: overallStatus === 'resolved_by_call' ? '#ffffff' : '#475569',\n                    border: overallStatus === 'resolved_by_call' ? '1px solid #047857' : '1px solid #dcd5c9',"
    )
    content = content.replace(
        "background: overallStatus === 'visit_required' ? '#dc2626' : '#ffffff',",
        "background: overallStatus === 'visit_required' ? '#dc2626' : '#fbf9f5',"
    )

    # 16. Pending modal & History modal
    content = content.replace(
        "maxHeight: '85vh',\n              background: '#ffffff',\n              borderRadius: 10,",
        "maxHeight: '85vh',\n              background: '#fbf9f5',\n              borderRadius: 10,\n              backgroundImage: 'var(--paper-texture)',\n              backgroundRepeat: 'repeat',"
    )
    content = content.replace(
        "borderBottom: '1px solid #e2e8f0',\n              display: 'flex',\n              alignItems: 'center',\n              justifyContent: 'space-between',\n              background: '#f8fafc'",
        "borderBottom: '1px solid #dcd5c9',\n              display: 'flex',\n              alignItems: 'center',\n              justifyContent: 'space-between',\n              background: '#ece7de'"
    )
    content = content.replace(
        "background: '#ffffff',\n                  border: '1px solid #e2e8f0',\n                  borderRadius: 5,\n                  padding: '4px 10px',",
        "background: '#fbf9f5',\n                  border: '1px solid #dcd5c9',\n                  borderRadius: 5,\n                  padding: '4px 10px',"
    )
    content = content.replace(
        "border: '1px solid #e2e8f0',\n                        borderRadius: 6,\n                        padding: '10px 14px',\n                        background: '#ffffff',",
        "border: '1px solid #dcd5c9',\n                        borderRadius: 6,\n                        padding: '10px 14px',\n                        background: '#fbf9f5',"
    )
    content = content.replace(
        "borderTop: '1px solid #e2e8f0',\n              display: 'flex',\n              alignItems: 'center',\n              justifyContent: 'space-between',\n              background: '#f8fafc'",
        "borderTop: '1px solid #dcd5c9',\n              display: 'flex',\n              alignItems: 'center',\n              justifyContent: 'space-between',\n              background: '#ece7de'"
    )
    content = content.replace(
        "background: '#ffffff',\n                  border: '1px solid #cbd5e1',\n                  borderRadius: 4,\n                  padding: '6px 16px',",
        "background: '#fbf9f5',\n                  border: '1px solid #dcd5c9',\n                  borderRadius: 4,\n                  padding: '6px 16px',"
    )
    content = content.replace(
        "maxHeight: '88vh',\n              background: '#ffffff',\n              borderRadius: 10,",
        "maxHeight: '88vh',\n              background: '#fbf9f5',\n              borderRadius: 10,\n              backgroundImage: 'var(--paper-texture)',\n              backgroundRepeat: 'repeat',"
    )
    content = content.replace(
        "border: active ? '1px solid #2563eb' : '1px solid #e2e8f0',\n                          background: active ? '#eff6ff' : '#ffffff',",
        "border: active ? '1px solid #1d4ed8' : '1px solid #dcd5c9',\n                          background: active ? '#eff6ff' : '#fbf9f5',"
    )
    content = content.replace(
        "borderRight: selectedHistoryItem ? '1px solid #e2e8f0' : 'none'",
        "borderRight: selectedHistoryItem ? '1px solid #dcd5c9' : 'none'"
    )
    content = content.replace(
        "border: isSelected ? '1px solid #2563eb' : '1px solid #e2e8f0',\n                          borderRadius: 6,\n                          padding: '10px 14px',\n                          background: isSelected ? '#eff6ff' : '#ffffff',",
        "border: isSelected ? '1px solid #1d4ed8' : '1px solid #dcd5c9',\n                          borderRadius: 6,\n                          padding: '10px 14px',\n                          background: isSelected ? '#eff6ff' : '#fbf9f5',"
    )
    content = content.replace(
        "background: '#f8fafc',\n                  display: 'flex',\n                  flexDirection: 'column',\n                  gap: 12",
        "background: '#f5f2eb',\n                  display: 'flex',\n                  flexDirection: 'column',\n                  gap: 12"
    )
    content = content.replace(
        "borderBottom: '1px solid #e2e8f0', paddingBottom: 8",
        "borderBottom: '1px solid #dcd5c9', paddingBottom: 8"
    )
    content = content.replace(
        "<div key={s.key} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>",
        "<div key={s.key} style={{ background: '#fbf9f5', border: '1px solid #dcd5c9', borderRadius: 6, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>"
    )
    content = content.replace(
        "background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 12px', fontSize: 13.5, color: '#334155'",
        "background: '#fbf9f5', border: '1px solid #dcd5c9', borderRadius: 6, padding: '10px 12px', fontSize: 13.5, color: '#334155'"
    )
    content = content.replace(
        "background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 3",
        "background: '#fbf9f5', border: '1px solid #dcd5c9', borderRadius: 6, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 3"
    )
    content = content.replace(
        "borderTop: '1px solid #e2e8f0',\n              display: 'flex',\n              alignItems: 'center',\n              justifyContent: 'flex-end',\n              background: '#f8fafc'",
        "borderTop: '1px solid #dcd5c9',\n              display: 'flex',\n              alignItems: 'center',\n              justifyContent: 'flex-end',\n              background: '#ece7de'"
    )
    content = content.replace(
        "background: '#ffffff',\n                  border: '1px solid #cbd5e1',\n                  borderRadius: 4,\n                  padding: '6px 16px',",
        "background: '#fbf9f5',\n                  border: '1px solid #dcd5c9',\n                  borderRadius: 4,\n                  padding: '6px 16px',"
    )

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated CounselAssistV2.tsx")

def update_schedule_page():
    path = "frontend/apps/desktop/src/SchedulePage.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # MiniCal
    content = content.replace(
        "border: '1px solid #e2e8f0', borderRadius: 8, padding: 8, marginBottom: 14, background: '#f8fafc'",
        "border: '1px solid #dcd5c9', borderRadius: 8, padding: 8, marginBottom: 14, background: '#f5f2eb'"
    )
    # Month view
    content = content.replace(
        "background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden'",
        "background: '#fbf9f5', border: '1px solid #dcd5c9', borderRadius: 8, overflow: 'hidden'"
    )
    content = content.replace(
        "padding: '8px 0', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',",
        "padding: '8px 0', background: '#ece7de', borderBottom: '1px solid #dcd5c9',"
    )
    content = content.replace(
        "borderRight: (idx + 1) % 7 === 0 ? 'none' : '1px solid #e2e8f0',",
        "borderRight: (idx + 1) % 7 === 0 ? 'none' : '1px solid #dcd5c9',"
    )
    content = content.replace(
        "borderBottom: '1px solid #e2e8f0',",
        "borderBottom: '1px solid #dcd5c9',"
    )
    content = content.replace(
        "background: isSel ? '#eff6ff' : isToday ? '#f8fafc' : '#ffffff',",
        "background: isSel ? '#eff6ff' : isToday ? '#f5f2eb' : '#fbf9f5',"
    )
    # Week & Day view
    content = content.replace(
        "<div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, minHeight: 400, padding: 16 }}>",
        "<div style={{ background: '#fbf9f5', border: '1px solid #dcd5c9', borderRadius: 8, minHeight: 400, padding: 16 }}>"
    )
    content = content.replace(
        "background: '#fff', borderRadius: 8, border: '1px dashed #cbd5e1'",
        "background: '#fbf9f5', borderRadius: 8, border: '1px dashed #dcd5c9'"
    )
    content = content.replace(
        "<div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>",
        "<div style={{ background: '#fbf9f5', border: '1px solid #dcd5c9', borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 3px rgba(40,30,20,0.05)' }}>"
    )
    content = content.replace(
        "borderBottom: '1px solid #e2e8f0'",
        "borderBottom: '1px solid #dcd5c9'"
    )
    content = content.replace(
        "borderBottom: '1px dashed #e2e8f0'",
        "borderBottom: '1px dashed #dcd5c9'"
    )
    # Outer container
    content = content.replace(
        "height: 'calc(100vh - 48px)', background: '#f8fafc', color: '#0f172a'",
        "height: 'calc(100vh - 48px)', backgroundColor: 'var(--bg-app)', backgroundImage: 'var(--paper-texture)', backgroundRepeat: 'repeat', color: '#0f172a'"
    )
    content = content.replace(
        "aside style={{ width: 240, flexShrink: 0, background: '#ffffff', borderRight: '1px solid #e2e8f0',",
        "aside style={{ width: 240, flexShrink: 0, background: '#fbf9f5', borderRight: '1px solid #dcd5c9',"
    )
    content = content.replace(
        "border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 12px', marginBottom: 14, background: '#f8fafc'",
        "border: '1px solid #dcd5c9', borderRadius: 6, padding: '10px 12px', marginBottom: 14, background: '#f5f2eb'"
    )
    content = content.replace(
        "border: '1px solid #cbd5e1', borderRadius: 4,\n                marginBottom: 6, outline: 'none', color: '#0f172a', background: '#ffffff'",
        "border: '1px solid #dcd5c9', borderRadius: 4,\n                marginBottom: 6, outline: 'none', color: '#0f172a', background: '#fbf9f5'"
    )
    content = content.replace(
        "border: '1px solid #cbd5e1', borderRadius: 4,\n                outline: 'none', color: '#0f172a', background: '#ffffff'",
        "border: '1px solid #dcd5c9', borderRadius: 4,\n                outline: 'none', color: '#0f172a', background: '#fbf9f5'"
    )
    content = content.replace(
        "borderTop: '1px solid #f1f5f9', paddingTop: 10",
        "borderTop: '1px solid #dcd5c9', paddingTop: 10"
    )
    content = content.replace(
        "style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '5px 12px'",
        "style={{ background: '#fbf9f5', border: '1px solid #dcd5c9', borderRadius: 6, padding: '5px 12px'"
    )
    content = content.replace(
        "style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '5px 8px'",
        "style={{ background: '#fbf9f5', border: '1px solid #dcd5c9', borderRadius: 6, padding: '5px 8px'"
    )
    content = content.replace(
        "background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a'",
        "background: '#fbf9f5', border: '1px solid #dcd5c9', color: '#0f172a'"
    )
    content = content.replace(
        "<div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: 6, overflow: 'hidden', background: '#ffffff' }}>",
        "<div style={{ display: 'flex', border: '1px solid #dcd5c9', borderRadius: 6, overflow: 'hidden', background: '#fbf9f5' }}>"
    )
    content = content.replace(
        "<div key={i} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>",
        "<div key={i} style={{ background: '#fbf9f5', border: '1px solid #dcd5c9', borderRadius: 8, padding: 12 }}>"
    )

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated SchedulePage.tsx")

def update_counsel_compare():
    path = "frontend/apps/desktop/src/CounselCompare.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    content = content.replace(
        "background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 8px'",
        "background: '#fbf9f5', border: '1px solid #dcd5c9', borderRadius: 4, padding: '2px 8px'"
    )
    content = content.replace(
        "background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 4, padding: '3px 10px'",
        "background: '#fbf9f5', border: '1px solid #dcd5c9', borderRadius: 4, padding: '3px 10px'"
    )
    content = content.replace(
        "minHeight: 'calc(100vh - 48px)', background: '#f8fafc', color: '#0f172a'",
        "minHeight: 'calc(100vh - 48px)', backgroundColor: 'var(--bg-app)', backgroundImage: 'var(--paper-texture)', backgroundRepeat: 'repeat', color: '#0f172a'"
    )
    content = content.replace(
        "background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '0 24px', display: 'flex', alignItems: 'center', height: 48, gap: 12",
        "background: '#ece7de', borderBottom: '1px solid #dcd5c9', padding: '0 24px', display: 'flex', alignItems: 'center', height: 48, gap: 12"
    )
    content = content.replace(
        "<div style={{ width: 1, height: 16, background: '#e2e8f0' }} />",
        "<div style={{ width: 1, height: 16, background: '#dcd5c9' }} />"
    )
    content = content.replace(
        "background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '4px 10px', fontSize: 13.5, fontWeight: 500, color: '#475569'",
        "background: '#fbf9f5', border: '1px solid #dcd5c9', borderRadius: 6, padding: '4px 10px', fontSize: 13.5, fontWeight: 500, color: '#475569'"
    )
    content = content.replace(
        "<div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>",
        "<div style={{ background: '#fbf9f5', borderRadius: 8, border: '1px solid #dcd5c9', padding: 16, boxShadow: '0 1px 3px rgba(40,30,20,0.05)' }}>"
    )
    content = content.replace(
        "border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 12px', fontSize: 14, outline: 'none', height: 38, boxSizing: 'border-box'",
        "border: '1px solid #dcd5c9', borderRadius: 6, padding: '8px 12px', fontSize: 14, outline: 'none', height: 38, boxSizing: 'border-box', background: '#fbf9f5'"
    )
    content = content.replace(
        "background: '#ffffff', borderRadius: 8, border: '1px solid #bfdbfe'",
        "background: '#fbf9f5', borderRadius: 8, border: '1px solid #bfdbfe'"
    )
    content = content.replace(
        "background: '#ffffff', borderRadius: 8, border: '1px solid #a7f3d0'",
        "background: '#fbf9f5', borderRadius: 8, border: '1px solid #a7f3d0'"
    )
    content = content.replace(
        "background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0'",
        "background: '#fbf9f5', borderRadius: 8, border: '1px solid #dcd5c9'"
    )

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated CounselCompare.tsx")

def update_event_modals():
    for fpath in ("frontend/apps/desktop/src/EventFormModal.tsx", "frontend/apps/desktop/src/EventDetailModal.tsx"):
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()

        content = content.replace("background: '#ffffff', borderRadius: 10,", "background: '#fbf9f5', borderRadius: 10,")
        content = content.replace("border: '1px solid #e2e8f0', color: '#0f172a'", "border: '1px solid #dcd5c9', color: '#0f172a'")
        content = content.replace("borderBottom: '1px solid #e2e8f0'", "borderBottom: '1px solid #dcd5c9'")
        content = content.replace("borderTop: '1px solid #e2e8f0'", "borderTop: '1px solid #dcd5c9'")
        content = content.replace("border: '1px solid #cbd5e1'", "border: '1px solid #dcd5c9'")
        content = content.replace("background: '#ffffff', border: '1px solid #cbd5e1'", "background: '#fbf9f5', border: '1px solid #dcd5c9'")
        content = content.replace("background: '#ffffff',", "background: '#fbf9f5',")
        content = content.replace("background: '#f8fafc',", "background: '#ece7de',")
        content = content.replace("borderBottom: '2px solid #e2e8f0'", "borderBottom: '2px solid #dcd5c9'")

        with open(fpath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {fpath}")

if __name__ == "__main__":
    update_counsel_assist_v2()
    update_schedule_page()
    update_counsel_compare()
    update_event_modals()
