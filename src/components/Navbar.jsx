import React from 'react';
import { 
  ShoppingCart, 
  Receipt, 
  Package, 
  Calendar, 
  Plus, 
  LogOut 
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  events, 
  currentEventId, 
  setCurrentEventId,
  onOpenNewEventModal,
  user
}) {
  const currentEvent = events.find(e => e.id === currentEventId);

  const handleLogout = () => {
    if (window.confirm("Deseja sair do sistema?")) {
      signOut(auth);
    }
  };

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 18px',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      gap: '12px',
      flexWrap: 'wrap'
    }}>
      {/* Logo e Nome da Loja */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 800,
          fontSize: '18px',
          boxShadow: '0 4px 10px rgba(56, 189, 248, 0.3)'
        }}>
          🐊
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '17px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            Crodiloja <span className="badge badge-primary">PDV</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Feiras & Eventos
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
        
        {events.length > 0 ? (
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
            {events.map((ev) => (
              <option key={ev.id} value={ev.id} style={{ background: '#1f2937', color: '#fff' }}>
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
            fontSize: '12px'
          }}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Navegação entre Abas e Botão Sair */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-main)',
          padding: '4px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
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

