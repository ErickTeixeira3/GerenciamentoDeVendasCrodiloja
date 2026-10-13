import React, { useMemo } from 'react';
import { 
  ShoppingCart, 
  Receipt, 
  Package, 
  Calendar, 
  Plus, 
  LogOut,
  Sun,
  Moon
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { confirmDialog } from './Common/ConfirmModal';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  events = [], 
  currentEventId, 
  setCurrentEventId,
  onOpenNewEventModal,
  user,
  isHeaderHidden = false,
  theme = 'light',
  toggleTheme = () => {}
}) {
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
  }, [events]);

  const currentEvent = sortedEvents.find(e => e.id === currentEventId);

  const handleLogout = async () => {
    const confirmed = await confirmDialog({
      title: "Sair do Sistema",
      message: "Deseja realmente sair da sua conta?",
      confirmText: "Sim, sair",
      cancelText: "Cancelar",
      danger: true
    });
    if (confirmed) {
      signOut(auth);
    }
  };

  return (
    <header 
      className={`app-navbar ${isHeaderHidden ? 'navbar-hidden' : ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isHeaderHidden ? '0 18px' : '10px 18px',
        background: 'var(--bg-surface)',
        borderBottom: isHeaderHidden ? 'none' : '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        gap: '10px',
        flexWrap: 'wrap',
        maxHeight: isHeaderHidden ? '0px' : '140px',
        opacity: isHeaderHidden ? 0 : 1,
        overflow: 'hidden',
        pointerEvents: isHeaderHidden ? 'none' : 'auto',
        transform: isHeaderHidden ? 'translateY(-100%)' : 'translateY(0)',
        transition: 'all 0.28s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      {/* Logo e Nome da Loja */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-strong)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '5px',
          boxShadow: 'var(--shadow-sm)',
          flexShrink: 0
        }}>
          <img 
            src="/logoCrodiloja.svg" 
            alt="Crodiloja" 
            className="crodiloja-logo" 
            style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
          />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)' }}>
            Crodiloja
          </div>
        </div>
      </div>

      {/* Seletor do Evento Atual */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--bg-surface-elevated)',
        padding: '4px 8px 4px 12px',
        borderRadius: 'var(--radius-full)',
        border: '1px solid var(--border-strong)',
        gap: '8px',
        maxWidth: '100%'
      }}>
        <Calendar size={16} color="var(--primary)" />
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Evento:</span>
        
        {sortedEvents.length > 0 ? (
          <select 
            value={currentEventId || ''} 
            onChange={(e) => setCurrentEventId(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '4px 6px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {sortedEvents.map((ev) => (
              <option key={ev.id} value={ev.id} style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                {ev.nome}
              </option>
            ))}
          </select>
        ) : (
          <button 
            onClick={onOpenNewEventModal}
            style={{
              background: 'transparent',
              color: 'var(--warning)',
              fontSize: '13px',
              fontWeight: 600,
              padding: '4px 6px'
            }}
          >
            + Criar 1º Evento
          </button>
        )}

        <button 
          onClick={onOpenNewEventModal}
          title="Adicionar novo evento"
          style={{
            background: 'var(--bg-surface-hover)',
            color: 'var(--text-primary)',
            width: '26px',
            height: '26px',
            borderRadius: 'var(--radius-full)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: 700
          }}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Navegação entre Abas e Ações */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <nav style={{
          display: 'flex',
          background: 'var(--bg-surface-elevated)',
          padding: '4px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-strong)',
          gap: '4px'
        }}>
          <button
            onClick={() => setActiveTab('pdv')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              background: activeTab === 'pdv' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'pdv' ? '#fff' : 'var(--text-secondary)'
            }}
          >
            <ShoppingCart size={16} />
            <span>PDV</span>
          </button>

          <button
            onClick={() => setActiveTab('vendas')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              background: activeTab === 'vendas' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'vendas' ? '#fff' : 'var(--text-secondary)'
            }}
          >
            <Receipt size={16} />
            <span>Vendas</span>
          </button>

          <button
            onClick={() => setActiveTab('produtos')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              background: activeTab === 'produtos' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'produtos' ? '#fff' : 'var(--text-secondary)'
            }}
          >
            <Package size={16} />
            <span>Produtos</span>
          </button>
        </nav>

        {/* Alternador de Tema Claro / Escuro */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
          style={{
            background: 'var(--bg-surface-elevated)',
            color: theme === 'dark' ? '#f59e0b' : 'var(--primary)',
            border: '1px solid var(--border-strong)',
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {user && (
          <button
            onClick={handleLogout}
            title={`Sair (${user.email})`}
            style={{
              background: 'var(--bg-surface-elevated)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-strong)',
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </header>
  );
}
