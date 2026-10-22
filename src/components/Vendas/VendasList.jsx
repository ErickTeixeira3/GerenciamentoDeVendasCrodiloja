import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  Trash2, 
  Calendar, 
  Filter,
  Edit2,
  Tag,
  Layers,
  RotateCcw
} from 'lucide-react';
import { deleteSale } from '../../services/firestoreService';
import { toast } from '../Common/ToastContainer';
import { confirmDialog } from '../Common/ConfirmModal';
import EditSaleModal from './EditSaleModal';
import MultiSelectDropdown from '../Common/MultiSelectDropdown';

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

export default function VendasList({ 
  sales = [], 
  events = [], 
  currentEventId, 
  products = [], 
  categories = [], 
  collections = [] 
}) {
  const [filterEventId, setFilterEventId] = useState(currentEventId || 'ALL');
  const [startDate, setStartDate] = useState(() => getDefaultDates().start);
  const [endDate, setEndDate] = useState(() => getDefaultDates().end);
  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState([]);
  const [selectedCollectionFilters, setSelectedCollectionFilters] = useState([]);
  const [editingSale, setEditingSale] = useState(null);

  // Eventos ordenados alfabeticamente
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
  }, [events]);

  // Categorias e Coleções ordenadas para opções do MultiSelectDropdown
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
  }, [categories]);

  const sortedCollections = useMemo(() => {
    return [...collections].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
  }, [collections]);

  const categorySelectOptions = useMemo(() => [
    ...sortedCategories.map(c => ({ id: c.id, label: c.nome })),
    { id: '__sem_categoria__', label: 'Sem categoria' }
  ], [sortedCategories]);

  const collectionSelectOptions = useMemo(() => [
    ...sortedCollections.map(c => ({ id: c.id, label: c.nome })),
    { id: '__sem_colecao__', label: 'Sem coleção' }
  ], [sortedCollections]);

  // Mapa rápido de produtos para recuperar categoria e coleção dos itens
  const productsMap = useMemo(() => {
    const map = new Map();
    products.forEach(p => map.set(p.id, p));
    return map;
  }, [products]);

  // Filtragem por evento, intervalo de datas, categorias e coleções selecionadas
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      // 1. Filtro por Evento
      const matchEvent = filterEventId === 'ALL' || s.eventoId === filterEventId;
      if (!matchEvent) return false;

      // 2. Filtro por Data
      if (startDate || endDate) {
        const saleDate = getSaleDateObj(s.criadoEm);
        if (saleDate) {
          if (startDate) {
            const start = new Date(`${startDate}T00:00:00`);
            if (saleDate < start) return false;
          }
          if (endDate) {
            const end = new Date(`${endDate}T23:59:59.999`);
            if (saleDate > end) return false;
          }
        }
      }

      // 3. Filtro por Categorias selecionadas (múltipla seleção)
      if (selectedCategoryFilters.length > 0) {
        const hasMatchingCategory = (s.itens || []).some(item => {
          const prod = productsMap.get(item.produtoId);
          const catId = prod?.categoriaId || item.categoriaId || '';
          return selectedCategoryFilters.some(cf => cf === '__sem_categoria__' ? !catId : catId === cf);
        });
        if (!hasMatchingCategory) return false;
      }

      // 4. Filtro por Coleções selecionadas (múltipla seleção)
      if (selectedCollectionFilters.length > 0) {
        const hasMatchingCollection = (s.itens || []).some(item => {
          const prod = productsMap.get(item.produtoId);
          const colId = prod?.colecaoId || item.colecaoId || '';
          return selectedCollectionFilters.some(cf => cf === '__sem_colecao__' ? !colId : colId === cf);
        });
        if (!hasMatchingCollection) return false;
      }

      return true;
    });
  }, [sales, filterEventId, startDate, endDate, selectedCategoryFilters, selectedCollectionFilters, productsMap]);

  // Totais do Período e Filtros Selecionados
  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + (s.valorTotal || 0), 0);
  }, [filteredSales]);

  // Ticket Médio
  const averageTicket = useMemo(() => {
    if (filteredSales.length === 0) return 0;
    return totalRevenue / filteredSales.length;
  }, [filteredSales, totalRevenue]);

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

  const handleDelete = async (sale) => {
    const itemsCount = (sale.itens || []).reduce((sum, item) => sum + (item.quantidade || 0), 0);
    const confirmed = await confirmDialog({
      title: "Cancelar Venda",
      message: `Tem certeza que deseja cancelar esta venda de R$ ${(sale.valorTotal || 0).toFixed(2).replace('.', ',')}? O estoque de ${itemsCount} unidade(s) vendida(s) será estornado automaticamente.`,
      confirmText: "Sim, cancelar e estornar",
      cancelText: "Não, manter venda",
      danger: true
    });

    if (confirmed) {
      try {
        await deleteSale(sale);
        toast.success("Venda cancelada e estoque estornado com sucesso!");
      } catch (err) {
        toast.error("Erro ao cancelar venda: " + err.message);
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
      {/* Topo com Título e Botão de Limpar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '14px'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Histórico de Vendas
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px', margin: 0 }}>
            Gerencie pedidos, lucros e acompanhe métricas de faturamento e ticket médio
          </p>
        </div>

        {(filterEventId !== 'ALL' || selectedCategoryFilters.length > 0 || selectedCollectionFilters.length > 0) && (
          <button
            type="button"
            onClick={() => {
              setFilterEventId('ALL');
              setSelectedCategoryFilters([]);
              setSelectedCollectionFilters([]);
            }}
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <RotateCcw size={13} /> Limpar filtros
          </button>
        )}
      </div>

      {/* Barra de Filtros: Eventos, Categorias, Coleções e Período */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        background: 'var(--bg-surface)',
        padding: '12px 16px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
          {/* Filtro de Evento */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={15} color="var(--text-muted)" />
            <select
              value={filterEventId}
              onChange={(e) => setFilterEventId(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: 600,
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-strong)',
                cursor: 'pointer',
                outline: 'none'
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

          {/* Filtro de Categorias (múltipla seleção) */}
          <MultiSelectDropdown
            icon={Tag}
            iconColor="var(--primary)"
            placeholder="Todas as categorias"
            allLabel="Todas as categorias"
            itemLabelSingular="categoria"
            itemLabelPlural="categorias"
            options={categorySelectOptions}
            selectedValues={selectedCategoryFilters}
            onChange={setSelectedCategoryFilters}
            minWidth="175px"
            accentColor="var(--primary)"
          />

          {/* Filtro de Coleções (múltipla seleção) */}
          <MultiSelectDropdown
            icon={Layers}
            iconColor="#a855f7"
            placeholder="Todas as coleções"
            allLabel="Todas as coleções"
            itemLabelSingular="coleção"
            itemLabelPlural="coleções"
            options={collectionSelectOptions}
            selectedValues={selectedCollectionFilters}
            onChange={setSelectedCollectionFilters}
            minWidth="175px"
            accentColor="#a855f7"
          />
        </div>

        {/* Filtro de Período (Data) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'var(--bg-surface-elevated)',
          padding: '3px 8px',
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
              padding: '5px 2px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              outline: 'none'
            }}
          />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              padding: '5px 2px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Cards de Métricas do Evento */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '12px',
        marginBottom: '24px'
      }}>
        {/* Faturamento Total */}
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

        {/* Ticket Médio */}
        <div style={{
          background: 'var(--bg-surface)',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
            TICKET MÉDIO
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981' }}>
            R$ {averageTicket.toFixed(2).replace('.', ',')}
          </div>
        </div>

        {/* Qtd. de Vendas */}
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
            {filteredSales.length} {filteredSales.length === 1 ? 'pedido' : 'pedidos'}
          </div>
        </div>

        {/* Itens Vendidos */}
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

        {/* Lucro Bruto Estimado */}
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
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {sales.length === 0 ? 'Nenhuma venda registrada ainda' : 'Nenhuma venda encontrada com os filtros selecionados'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            {sales.length === 0 
              ? 'Faça sua primeira venda na aba PDV para ver os pedidos aqui!' 
              : 'Tente alterar o período, evento, categorias ou coleções selecionadas.'}
          </p>
          {sales.length > 0 && (filterEventId !== 'ALL' || selectedCategoryFilters.length > 0 || selectedCollectionFilters.length > 0) && (
            <button
              type="button"
              onClick={() => {
                setFilterEventId('ALL');
                setSelectedCategoryFilters([]);
                setSelectedCollectionFilters([]);
              }}
              style={{
                marginTop: '12px',
                padding: '8px 16px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-strong)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Limpar filtros
            </button>
          )}
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)', marginRight: '4px' }}>
                    R$ {(sale.valorTotal || 0).toFixed(2).replace('.', ',')}
                  </span>

                  <button
                    onClick={() => setEditingSale(sale)}
                    title="Editar venda"
                    style={{
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                      border: 'none',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '12px',
                      fontWeight: 700
                    }}
                  >
                    <Edit2 size={14} />
                    <span>Editar</span>
                  </button>

                  <button
                    onClick={() => handleDelete(sale)}
                    title="Cancelar venda e estornar estoque"
                    style={{
                      background: 'var(--danger-light)',
                      color: 'var(--danger)',
                      border: 'none',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '12px',
                      fontWeight: 700
                    }}
                  >
                    <Trash2 size={14} />
                    <span>Cancelar</span>
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
                {(sale.itens || []).map((it, idx) => {
                  const prod = productsMap.get(it.produtoId);
                  const catId = prod?.categoriaId || it.categoriaId;
                  const colId = prod?.colecaoId || it.colecaoId;
                  const catName = sortedCategories.find(c => c.id === catId)?.nome;
                  const colName = sortedCollections.find(c => c.id === colId)?.nome;

                  return (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>{it.quantidade}x</strong> {it.nome}
                        </span>
                        {catName && (
                          <span style={{ fontSize: '11px', background: 'rgba(56, 189, 248, 0.12)', color: 'var(--primary)', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            {catName}
                          </span>
                        )}
                        {colName && (
                          <span style={{ fontSize: '11px', background: 'rgba(168, 85, 247, 0.12)', color: '#a855f7', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            {colName}
                          </span>
                        )}
                      </div>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        R$ {(it.subtotal || 0).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  );
                })}

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

      {/* Modal de Edição de Venda */}
      {editingSale && (
        <EditSaleModal
          isOpen={!!editingSale}
          onClose={() => setEditingSale(null)}
          sale={editingSale}
          events={events}
          products={products}
        />
      )}
    </div>
  );
}
