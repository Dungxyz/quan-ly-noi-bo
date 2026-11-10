'use client';

export default function BangNhanSu({
  danhSach,
  loading,
  tuKhoa,
  setTuKhoa,
  onReload,
  onEdit,
  onToggleKhoa,
  onDelete,
  onNotifyZalo,
}) {
  return (
    <div style={{ padding: '0 24px 24px 24px' }}>
      {/* Tiêu đề & Thanh tìm kiếm */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#334155' }}>
            📋 DANH SÁCH NHÂN VIÊN ĐÃ LƯU
          </span>
          <span style={{ backgroundColor: '#0284c7', color: '#fff', fontSize: '12px', fontWeight: 'bold', padding: '3px 10px', borderRadius: '12px' }}>
            {danhSach.length} nhân viên
          </span>
          <button
            type="button"
            onClick={onReload}
            title="Tải lại danh sách"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px', color: '#64748b' }}
          >
            🔄
          </button>
        </div>

        <div>
          <input
            type="text"
            placeholder="🔍 Tìm Mã, Tên, SĐT, Bộ phận..."
            value={tuKhoa}
            onChange={(e) => setTuKhoa(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              width: '280px',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Bảng nhân sự */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Đang tải danh sách...</div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '12px' }}>
                <th style={{ padding: '10px 14px' }}>MÃ NV</th>
                <th style={{ padding: '10px 14px' }}>HỌ TÊN</th>
                <th style={{ padding: '10px 14px' }}>SĐT (MẬT KHẨU)</th>
                <th style={{ padding: '10px 14px' }}>BỘ PHẬN</th>
                <th style={{ padding: '10px 14px' }}>VỊ TRÍ</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {danhSach.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    Không tìm thấy dữ liệu phù hợp
                  </td>
                </tr>
              ) : (
                danhSach.map((nv) => {
                  const isLocked = nv.phan_quyen === 'LOCKED';
                  return (
                    <tr
                      key={nv.ma_nv}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isLocked ? '#fffbfb' : '#fff',
                      }}
                    >
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            color: isLocked ? '#dc2626' : '#0284c7',
                            fontWeight: 'bold',
                            textDecoration: isLocked ? 'line-through' : 'none',
                            marginRight: '6px',
                          }}
                        >
                          {nv.ma_nv}
                        </span>
                        {isLocked && (
                          <span style={{ backgroundColor: '#ef4444', color: '#fff', fontSize: '10px', padding: '2px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                            LOCKED
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '10px 14px', fontWeight: '600', color: '#1e293b' }}>
                        {nv.ho_ten}
                      </td>

                      <td style={{ padding: '10px 14px', color: '#475569' }}>
                        {nv.so_dien_thoai}
                      </td>

                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            backgroundColor: '#0f172a',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            display: 'inline-block',
                          }}
                        >
                          {nv.bo_phan || 'N/A'}
                        </span>
                      </td>

                      <td style={{ padding: '10px 14px', color: '#475569' }}>
                        {nv.vi_tri || '—'}
                      </td>

                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => onEdit(nv)}
                            title="Sửa thông tin"
                            style={{ ...btnThaoTacStyle, borderColor: '#38bdf8', color: '#0284c7' }}
                          >
                            ✏️
                          </button>
                          
                          {/* 👉 THÊM NÚT ĐỔI MẬT KHẨU TẠI ĐÂY */}
                          {onDoiMatKhau && (
                            <button
                              type="button"
                              onClick={() => onDoiMatKhau(nv)}
                              title="Đổi/Cấp lại mật khẩu"
                              style={{
                                padding: '4px 6px',
                                border: '1px solid #fed7aa',
                                backgroundColor: '#fff7ed',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                              }}
                            >
                              🔑
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onNotifyZalo(nv)}
                            title="Gửi bot thông báo"
                            style={{ ...btnThaoTacStyle, borderColor: '#4ade80', color: '#16a34a' }}
                          >
                            ✈️
                          </button>

                          <button
                            type="button"
                            onClick={() => onToggleKhoa(nv.ma_nv, nv.phan_quyen)}
                            title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                            style={{ ...btnThaoTacStyle, borderColor: '#facc15', color: '#ca8a04' }}
                          >
                            {isLocked ? '🔓' : '🔒'}
                          </button>

                          <button
                            type="button"
                            onClick={() => onDelete(nv.ma_nv, nv.ho_ten)}
                            title="Xóa nhân viên"
                            style={{ ...btnThaoTacStyle, borderColor: '#f87171', color: '#dc2626' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const btnThaoTacStyle = {
  width: '30px',
  height: '28px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#fff',
  border: '1px solid #cbd5e1',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
};