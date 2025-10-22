import React, { useState } from 'react';
import {
  LayoutDashboard,
  BarChart2,
  Settings,
  UserCog
} from 'lucide-react';
import './SidebarModern.css';


function getMenuItemsByRole(role) {
  if (role === 'admin') {
    return [
      { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={22} /> },
      { key: 'analytics', label: 'Analytics', icon: <BarChart2 size={22} /> },
      { key: 'gestao', label: 'Gestão', icon: <UserCog size={22} /> },
    ];
  }
  if (role === 'atendente') {
    return [
      { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={22} /> },
    ];
  }
  if (role === 'gestor') {
    return [
      { key: 'gestao', label: 'Gestão', icon: <UserCog size={22} /> },
    ];
  }
  return [];
}

export default function SidebarModern({ usuario, pagina, onNavigate }) {
  const [collapsed, setCollapsed] = useState(false);
  const role = usuario?.role;
  const menuItems = getMenuItemsByRole(role);

  return (
    <aside className={`sidebar-modern${collapsed ? ' collapsed' : ''}`}>  
      <div className="sidebar-modern-header">
        {!collapsed && (
          <span className="sidebar-modern-title">GridTicks</span>
        )}
        <button className="sidebar-modern-toggle" onClick={() => setCollapsed(c => !c)} aria-label="Expandir/Retrair menu">
          <span className="sidebar-modern-toggle-bar" />
          <span className="sidebar-modern-toggle-bar" />
          <span className="sidebar-modern-toggle-bar" />
        </button>
      </div>

      <nav className="sidebar-modern-menu">
        {menuItems.map(item => (
          <button
            key={item.key}
            className={`sidebar-modern-menu-item${pagina === item.key ? ' active' : ''}`}
            onClick={() => onNavigate(item.key)}
            title={item.label}
          >
            <span className="sidebar-modern-menu-icon">{item.icon}</span>
            {!collapsed && <span className="sidebar-modern-menu-label">{item.label}</span>}
          </button>
        ))}
      </nav>
      <div className="sidebar-modern-footer">
        <div className="sidebar-modern-user">
          <div className="sidebar-modern-avatar">
            <img src={usuario?.fotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(usuario?.nome || 'U')}&background=23243a&color=fff&size=128`} alt="Avatar" />
          </div>
          {!collapsed && (
            <div className="sidebar-modern-user-info">
              <div className="sidebar-modern-user-nome">{
                usuario?.nome
                  ? (() => {
                      const partes = usuario.nome.trim().split(' ').filter(Boolean);
                      if (partes.length <= 2) return partes.join(' ');
                      const [primeiro, segundo, ...sobrenomes] = partes;
                      const abreviados = sobrenomes.map(s => s[0].toUpperCase() + '.');
                      return [primeiro, segundo, ...abreviados].join(' ');
                    })()
                  : 'Usuário'
              }</div>
              <div className="sidebar-modern-user-email">{usuario?.email || ''}</div>
              <button
                className="sidebar-modern-logout"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    // Limpa tokens comuns e redireciona para login
                    localStorage.clear();
                    sessionStorage.clear();
                    if (window.location.pathname !== '/login') {
                      window.location.href = '/login';
                    } else {
                      window.location.reload();
                    }
                  }
                }}
                title="Sair"
              >
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
