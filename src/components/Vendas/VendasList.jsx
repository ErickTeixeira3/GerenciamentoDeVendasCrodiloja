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

export default function VendasList({ sales, events, currentEventId }) {
  const [filterEventId, setFilterEventId] = useState(currentEventId || 'ALL');

  // Filtragem por evento selecionado
  const filteredSales = useMemo(() => {
    if (filterEventId === 'ALL') return sales;
    return sales.filter((s) => s.eventoId === filterEventId);
  }, [sales, filterEventId]);

  // Totais do Evento Selecionado
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
    if (window.confirm("Tem certeza que deseja cancelar/excluir este registro de venda?")) {
      try {
        await deleteSale(saleId);
      } catch (err) {
        alert("Erro ao excluir venda: " + err.message);
      }
    }
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return "Hoje";
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
      {/* Topo com Filtro de Evento */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', margin: 0 }}>
            Histórico de Vendas
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
            Registros gravados no Firestore em tempo real
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} color="var(--text-muted)" />
          <select
            value={filterEventId}
            onChange={(e) => setFilterEventId(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            <option value="ALL">Todos os Eventos</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.nome}
              </option>
            ))}
          </select>
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
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff' }}>
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
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Nenhuma venda registrada ainda</h3>
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
                  <span style={{ fontWeight: 800, fontSize: '15px', color: '#fff' }}>
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
                      <strong style={{ color: '#fff' }}>{it.quantidade}x</strong> {it.nome}
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
