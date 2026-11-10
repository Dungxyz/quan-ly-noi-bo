'use client';

export default function Toast({ toast, onClose }) {
  if (!toast?.show) return null;

  const isError = toast.type === 'error';
  const isWarning = toast.type === 'warning';

  return (
    <div
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 1000000,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 20px',
        borderRadius: '8px',
        backgroundColor: '#fff',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        borderLeft: `5px solid ${isError ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981'}`,
        maxWidth: '420px',
      }}
    >
      <span style={{ fontSize: '20px' }}>
        {isError ? '❌' : isWarning ? '⚠️' : '✅'}
      </span>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 'bold',
            color: isError ? '#b91c1c' : isWarning ? '#b45309' : '#047857',
          }}
        >
          {isError ? 'Cảnh báo lỗi' : isWarning ? 'Lưu ý' : 'Thành công'}
        </div>
        <div style={{ fontSize: '13px', color: '#334155', marginTop: '2px', lineHeight: 1.4 }}>
          {toast.message}
        </div>
      </div>
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px' }}
      >
        ✕
      </button>
    </div>
  );
}