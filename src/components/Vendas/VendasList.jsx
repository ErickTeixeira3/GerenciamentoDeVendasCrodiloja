import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  Trash2, 
  Calendar, 
  DollarSign, 
  ShoppingBag, 
  Tag, 
  Filter,
  CheckCircle2
} from 'lucide-react';
import { deleteSale } from '../../services/firestoreService';
import { toast } from '../Common/ToastContainer';
import { confirmDialog } from '../Common/ConfirmModal';

// Helper para formatar data em YYYY-MM-DD
const formatDateToISO = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getDefaultDates = () => {
  const today = new Date();
  const past90 = new Date();
  past90.setDate(past90.getDate() - 90);
  return {
    start: formatDateToISO(past90),
    end: formatDateToISO(today)
  };
};

const getSaleDateObj = (timestamp) => {
  if (!timestamp) return null;
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
  const d = new Date(timestamp);
  return isNaN(d.getTime()) ? null : d;
};

export default function VendasList({ sales = [], events = [], currentEventId }) {
  const [filterEventId, setFilterEventId] = useState(currentEventId || 'ALL');
  const [startDate, setStartDate] = useState(() => getDefaultDates().start);
  const [endDate, setEndDate] = useState(() => getDefaultDates().end);

  // Eventos ordenados alfabeticamente
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
  }, [events]);

  // Filtragem por evento selecionado e intervalo de datas (90 dias por padrão)
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchEvent = filterEventId === 'ALL' || s.eventoId === filterEventId;
      if (!matchEvent) return false;

      if (!startDate && !endDate) return true;

      const saleDate = getSaleDateObj(s.criadoEm);
      if (!saleDate) return true;

      if (startDate) {
        const start = new Date(`${startDate}T00:00:00`);
        if (saleDate < start) return false;
      }

      if (endDate) {
        const end = new Date(`${endDate}T23:59:59.999`);
        if (saleDate > end) return false;
      }

      return true;
    });
  }, [sales, filterEventId, startDate, endDate]);

  // Totais do Período e Evento Selecionados
  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + (s.valorTotal || 0), 0);
  }, [filteredSales]);

  const totalItemsSold = useMemo(() => {
    return filteredSales.reduce((acc, s) => {
      const itemsCount = (s.itens || []).reduce((sum, item) => sum + (item.quantidade || 0), 0);
      return acc + itemsCount;
    }, 0);
  }, [filteredSales]);

  const totalProfitEstimate = useMemo(() => {
    return filteredSales.reduce((acc, s) => {
      const saleCost = (s.itens || []).reduce((sum, item) => {
        return sum + ((item.precoCusto || 0) * (item.quantidade || 0));
      }, 0);
      return acc + ((s.valorTotal || 0) - saleCost);
    }, 0);
  }, [filteredSales]);

  const handleDelete = async (saleId) => {
    const confirmed = await confirmDialog({
      title: "Cancelar Venda",
      message: "Tem certeza que deseja cancelar/excluir este registro de venda?",
      confirmText: "Sim, cancelar venda",
      cancelText: "Não, manter",
      danger: true
    });

    if (confirmed) {
      try {
        await deleteSale(saleId);
        toast.success("Venda cancelada com sucesso.");
      } catch (err) {
        toast.error("Erro ao excluir venda: " + err.message);
      }
    }
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return "Hoje";
    const dateObj = getSaleDateObj(timestamp);
    if (!dateObj) return "Hoje";

    const today = new Date();
    const isToday = dateObj.toDateString() === today.toDateString();
    const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) {
      return `Hoje, ${timeStr}`;
    }
    const dateStr = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${dateStr} às ${timeStr}`;
  };

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '20px',
      maxWidth: '1000px',
      margin: '0 auto',
      width: '100%'
    }}>
      {/* Topo com Filtros de Evento e Data */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Histórico de Vendas
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Filtro de Evento */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={16} color="var(--text-muted)" />
            <select
              value={filterEventId}
              onChange={(e) => setFilterEventId(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: 600,
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-strong)'
              }}
            >
              <option value="ALL">Todos os Eventos</option>
              {sortedEvents.map((ev) => (
                <option key={ev.id} value={ev.id} style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                  {ev.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de Período (Data) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-surface)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-strong)'
          }}>
            <Calendar size={15} color="var(--text-muted)" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                padding: '6px 2px',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            />
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                padding: '6px 2px',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            />
          </div>
        </div>
      </div>

      {/* Cards de Métricas do Evento */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: 'var(--bg-surface)',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
            FATURAMENTO TOTAL
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>
            R$ {totalRevenue.toFixed(2).replace('.', ',')}
          </div>
        </div>

        <div style={{
          background: 'var(--bg-surface)',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
            QTD. DE VENDAS
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>
            {filteredSales.length} pedidos
          </div>
        </div>

        <div style={{
          background: 'var(--bg-surface)',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
            ITENS VENDIDOS
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent)' }}>
            {totalItemsSold} un.
          </div>
        </div>

        <div style={{
          background: 'var(--bg-surface)',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
            LUCRO BRUTO ESTIMADO
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#38bdf8' }}>
            R$ {totalProfitEstimate.toFixed(2).replace('.', ',')}
          </div>
        </div>
      </div>

      {/* Lista de Vendas */}
      {filteredSales.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)'
        }}>
          <Receipt size={48} strokeWidth={1.2} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Nenhuma venda registrada ainda</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Faça sua primeira venda na aba PDV para ver os pedidos aqui!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredSales.map((sale) => (
            <div
              key={sale.id}
              style={{
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>
                    {formatDateTime(sale.criadoEm)}
                  </span>
                  <span className="badge badge-primary">
                    {sale.formaPagamento?.toUpperCase() || 'PAGAMENTO'}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    • {sale.eventoNome || 'Evento'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>
                    R$ {(sale.valorTotal || 0).toFixed(2).replace('.', ',')}
                  </span>

                  <button
                    onClick={() => handleDelete(sale.id)}
                    title="Excluir venda"
                    style={{
                      background: 'transparent',
                      color: 'var(--text-muted)',
                      padding: '4px',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Itens da Venda */}
              <div style={{
                background: 'var(--bg-surface-elevated)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                {(sale.itens || []).map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{it.quantidade}x</strong> {it.nome}
                    </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      R$ {(it.subtotal || 0).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                ))}

                {sale.desconto > 0 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    color: 'var(--danger)',
                    marginTop: '4px',
                    borderTop: '1px dashed var(--border-subtle)',
                    paddingTop: '4px'
                  }}>
                    <span>Desconto</span>
                    <span>- R$ {sale.desconto.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
