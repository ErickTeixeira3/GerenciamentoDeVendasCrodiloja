import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  Save, 
  Search, 
  RotateCcw,
  Edit2,
  CreditCard,
  Banknote,
  QrCode
} from 'lucide-react';
import { updateSale } from '../../services/firestoreService';
import { toast } from '../Common/ToastContainer';

export default function EditSaleModal({ isOpen, onClose, sale, events = [], products = [] }) {
  // Estado dos campos da venda
  const [eventoId, setEventoId] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('pix');
  const [observacoes, setObservacoes] = useState('');
  const [desconto, setDesconto] = useState(0);
  const [itens, setItens] = useState([]);

  // Busca e adição de novos produtos
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sincroniza o estado quando a venda mudar ou o modal abrir
  useEffect(() => {
    if (sale) {
      setEventoId(sale.eventoId || '');
      setFormaPagamento(sale.formaPagamento || 'pix');
      setObservacoes(sale.observacoes || '');
      setDesconto(Number(sale.desconto || 0));
      setItens((sale.itens || []).map((it) => ({
        produtoId: it.produtoId || '',
        nome: it.nome || 'Produto',
        quantidade: Number(it.quantidade || 1),
        precoUnitario: Number(it.precoUnitario !== undefined ? it.precoUnitario : (it.subtotal && it.quantidade ? it.subtotal / it.quantidade : 0)),
        precoCusto: Number(it.precoCusto || 0),
        categoriaId: it.categoriaId || '',
        subtotal: Number(it.subtotal || 0)
      })));
      setIsAddingProduct(false);
      setProductSearch('');
    }
  }, [sale]);

  // Eventos ordenados alfabeticamente
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
  }, [events]);

  // Lista de produtos filtrada para adicionar à venda
  const filteredAvailableProducts = useMemo(() => {
    if (!productSearch.trim()) {
      return products.slice(0, 15);
    }
    const term = productSearch.toLowerCase().trim();
    return products
      .filter((p) => (p.nome || '').toLowerCase().includes(term))
      .slice(0, 15);
  }, [products, productSearch]);

  // Cálculos financeiros
  const subtotal = useMemo(() => {
    return itens.reduce((acc, it) => acc + (Number(it.quantidade || 0) * Number(it.precoUnitario || 0)), 0);
  }, [itens]);

  const valorTotal = useMemo(() => {
    return Math.max(0, subtotal - Number(desconto || 0));
  }, [subtotal, desconto]);

  const totalCost = useMemo(() => {
    return itens.reduce((acc, it) => acc + ((Number(it.precoCusto || 0)) * (Number(it.quantidade || 0))), 0);
  }, [itens]);

  const lucroEstimado = useMemo(() => {
    return valorTotal - totalCost;
  }, [valorTotal, totalCost]);

  // Cálculo das diferenças de estoque para exibir na tela (transparência total)
  const stockDeltasPreview = useMemo(() => {
    if (!sale) return [];
    const origMap = new Map();
    (sale.itens || []).forEach((it) => {
      if (it.produtoId) {
        origMap.set(it.produtoId, {
          nome: it.nome,
          qty: (origMap.get(it.produtoId)?.qty || 0) + Number(it.quantidade || 0)
        });
      }
    });

    const newMap = new Map();
    itens.forEach((it) => {
      if (it.produtoId) {
        newMap.set(it.produtoId, {
          nome: it.nome,
          qty: (newMap.get(it.produtoId)?.qty || 0) + Number(it.quantidade || 0)
        });
      }
    });

    const allProductIds = new Set([...origMap.keys(), ...newMap.keys()]);
    const deltas = [];

    allProductIds.forEach((pId) => {
      const origQty = origMap.get(pId)?.qty || 0;
      const newQty = newMap.get(pId)?.qty || 0;
      const nome = newMap.get(pId)?.nome || origMap.get(pId)?.nome || 'Produto';
      const delta = origQty - newQty; // positivo = estorno, negativo = baixa

      if (delta !== 0) {
        deltas.push({
          produtoId: pId,
          nome,
          origQty,
          newQty,
          delta
        });
      }
    });

    return deltas;
  }, [sale, itens]);

  // Se o modal não estiver aberto ou não houver venda, retorna null após todos os hooks
  if (!isOpen || !sale) return null;

  // Atualiza quantidade de um item
  const handleUpdateQuantity = (index, newQty) => {
    const qty = Math.max(1, Number(newQty) || 1);
    setItens((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };
      item.quantidade = qty;
      item.subtotal = Math.round(qty * item.precoUnitario * 100) / 100;
      copy[index] = item;
      return copy;
    });
  };

  // Atualiza preço unitário de um item
  const handleUpdateUnitPrice = (index, newPrice) => {
    const price = Math.max(0, Number(newPrice) || 0);
    setItens((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };
      item.precoUnitario = price;
      item.subtotal = Math.round(item.quantidade * price * 100) / 100;
      copy[index] = item;
      return copy;
    });
  };

  // Remove um item da venda
  const handleRemoveItem = (index) => {
    setItens((prev) => prev.filter((_, i) => i !== index));
  };

  // Adiciona um produto do catálogo à venda
  const handleAddProductToSale = (prod) => {
    setItens((prev) => {
      const existingIndex = prev.findIndex((it) => it.produtoId === prod.id);
      if (existingIndex >= 0) {
        // Se já está na venda, apenas incrementa a quantidade
        const copy = [...prev];
        const item = { ...copy[existingIndex] };
        item.quantidade += 1;
        item.subtotal = Math.round(item.quantidade * item.precoUnitario * 100) / 100;
        copy[existingIndex] = item;
        return copy;
      }

      // Adiciona novo item
      const unitPrice = Number(prod.preco || 0);
      return [
        ...prev,
        {
          produtoId: prod.id,
          nome: prod.nome,
          quantidade: 1,
          precoUnitario: unitPrice,
          precoCusto: Number(prod.precoCusto || 0),
          categoriaId: prod.categoriaId || '',
          colecaoId: prod.colecaoId || '',
          subtotal: unitPrice
        }
      ];
    });

    setProductSearch('');
    setIsAddingProduct(false);
  };

  // Submissão / Salvamento
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (itens.length === 0) {
      toast.error("A venda precisa conter pelo menos 1 item. Caso queira cancelar a venda inteira, use a opção 'Cancelar'.");
      return;
    }

    if (!eventoId) {
      toast.error("Por favor, selecione um evento/feira para a venda.");
      return;
    }

    try {
      setIsSubmitting(true);

      const selectedEvent = events.find((ev) => ev.id === eventoId);
      const updatedData = {
        eventoId: eventoId,
        eventoNome: selectedEvent?.nome || sale.eventoNome || 'Evento',
        formaPagamento: formaPagamento,
        observacoes: observacoes.trim(),
        desconto: Math.round(Number(desconto || 0) * 100) / 100,
        subtotal: Math.round(subtotal * 100) / 100,
        valorTotal: Math.round(valorTotal * 100) / 100,
        itens: itens.map((it) => ({
          produtoId: it.produtoId,
          nome: it.nome,
          quantidade: Number(it.quantidade),
          precoUnitario: Math.round(Number(it.precoUnitario) * 100) / 100,
          precoCusto: Math.round(Number(it.precoCusto || 0) * 100) / 100,
          subtotal: Math.round(Number(it.quantidade) * Number(it.precoUnitario) * 100) / 100,
          categoriaId: it.categoriaId || ''
        }))
      };

      await updateSale(sale.id, sale, updatedData);
      toast.success("Venda atualizada com sucesso! O estoque foi recalculado.");
      onClose();
    } catch (err) {
      console.error("Erro ao atualizar venda:", err);
      toast.error("Erro ao salvar alterações da venda: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentOptions = [
    { id: 'pix', label: 'Pix', icon: QrCode },
    { id: 'dinheiro', label: 'Dinheiro', icon: Banknote },
    { id: 'debito', label: 'Débito', icon: CreditCard },
    { id: 'credito', label: 'Crédito', icon: CreditCard }
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(5px)',
      zIndex: 80,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-strong)',
        borderRadius: '20px',
        padding: '24px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Topo do Modal */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'var(--primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)'
            }}>
              <Edit2 size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Editar Venda
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Ajuste itens, quantidades, valores e formas de pagamento
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Seção 1: Evento e Pagamento */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '14px',
            background: 'var(--bg-surface-elevated)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            {/* Evento */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Evento / Feira:
              </label>
              <select
                value={eventoId}
                onChange={(e) => setEventoId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-strong)',
                  fontSize: '13px',
                  fontWeight: 600,
                  outline: 'none'
                }}
              >
                {sortedEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Forma de Pagamento */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Forma de Pagamento:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {paymentOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = formaPagamento === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFormaPagamento(opt.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        padding: '8px 4px',
                        borderRadius: 'var(--radius-sm)',
                        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                        background: isSelected ? 'var(--primary-light)' : 'var(--bg-surface)',
                        color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                        fontWeight: 700,
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                    >
                      <Icon size={14} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Observações */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Observações (opcional):
              </label>
              <input
                type="text"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: cliente pagou uma parte em dinheiro, brinde aplicado, etc."
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-strong)',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Seção 2: Itens da Venda */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px'
            }}>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Itens da Venda
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                  ({itens.length} {itens.length === 1 ? 'item' : 'itens'})
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingProduct(!isAddingProduct)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Plus size={14} />
                Adicionar Produto
              </button>
            </div>

            {/* Seletor para adicionar produto */}
            {isAddingProduct && (
              <div style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                marginBottom: '12px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--bg-surface)',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '8px'
                }}>
                  <Search size={15} color="var(--text-muted)" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Buscar produto do catálogo por nome..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      width: '100%',
                      outline: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '13px'
                    }}
                  />
                  {productSearch && (
                    <button
                      type="button"
                      onClick={() => setProductSearch('')}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div style={{
                  maxHeight: '180px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  {filteredAvailableProducts.length === 0 ? (
                    <div style={{ padding: '8px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                      Nenhum produto encontrado.
                    </div>
                  ) : (
                    filteredAvailableProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAddProductToSale(p)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: 'none',
                          background: 'var(--bg-surface)',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {p.nome}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Estoque: {p.estoque || 0}
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>
                            R$ {(p.preco || 0).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Lista dos Itens */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {itens.length === 0 ? (
                <div style={{
                  padding: '24px',
                  textAlign: 'center',
                  background: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--danger)',
                  fontSize: '13px',
                  fontWeight: 600
                }}>
                  Nenhum item restante na venda! Adicione ao menos um item ou cancele a venda.
                </div>
              ) : (
                itens.map((it, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                        {it.nome}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        title="Remover item da venda (estornará o estoque)"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 600
                        }}
                      >
                        <Trash2 size={15} />
                        <span>Remover</span>
                      </button>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}>
                      {/* Controle de Quantidade */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                          Qtd:
                        </span>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          background: 'var(--bg-surface)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-strong)',
                          overflow: 'hidden'
                        }}>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(idx, it.quantidade - 1)}
                            disabled={it.quantidade <= 1}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              padding: '6px 8px',
                              cursor: it.quantidade <= 1 ? 'not-allowed' : 'pointer',
                              color: it.quantidade <= 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <Minus size={13} />
                          </button>

                          <input
                            type="number"
                            min="1"
                            value={it.quantidade}
                            onChange={(e) => handleUpdateQuantity(idx, e.target.value)}
                            style={{
                              width: '42px',
                              textAlign: 'center',
                              border: 'none',
                              background: 'transparent',
                              fontSize: '13px',
                              fontWeight: 700,
                              color: 'var(--text-primary)',
                              outline: 'none'
                            }}
                          />

                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(idx, it.quantidade + 1)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              padding: '6px 8px',
                              cursor: 'pointer',
                              color: 'var(--text-primary)',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Controle de Preço Unitário */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                          Preço Un. (R$):
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={it.precoUnitario}
                          onChange={(e) => handleUpdateUnitPrice(idx, e.target.value)}
                          style={{
                            width: '80px',
                            padding: '4px 8px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-strong)',
                            background: 'var(--bg-surface)',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            fontWeight: 700,
                            outline: 'none',
                            textAlign: 'right'
                          }}
                        />
                      </div>

                      {/* Subtotal do Item */}
                      <div style={{ textAlign: 'right', minWidth: '90px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
                          Subtotal
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                          R$ {(it.quantidade * it.precoUnitario).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Seção 3: Desconto & Totais */}
          <div style={{
            background: 'var(--bg-surface-elevated)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {/* Campo de Desconto */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Desconto Aplicado (R$):
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={subtotal}
                  value={desconto}
                  onChange={(e) => setDesconto(Math.max(0, Number(e.target.value) || 0))}
                  style={{
                    width: '90px',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-strong)',
                    background: 'var(--bg-surface)',
                    color: 'var(--danger)',
                    fontSize: '14px',
                    fontWeight: 700,
                    outline: 'none',
                    textAlign: 'right'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setDesconto(0)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  Zerar
                </button>
              </div>
            </div>

            {/* Linhas de Fechamento */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span>Subtotal dos itens:</span>
                <span style={{ fontWeight: 600 }}>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
              </div>

              {desconto > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--danger)' }}>
                  <span>Desconto:</span>
                  <span style={{ fontWeight: 700 }}>- R$ {Number(desconto).toFixed(2).replace('.', ',')}</span>
                </div>
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '18px',
                fontWeight: 900,
                color: 'var(--primary)',
                marginTop: '4px',
                borderTop: '1px dashed var(--border-strong)',
                paddingTop: '8px'
              }}>
                <span>Valor Final da Venda:</span>
                <span>R$ {valorTotal.toFixed(2).replace('.', ',')}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                <span>Lucro Bruto Estimado:</span>
                <span style={{ fontWeight: 600, color: '#38bdf8' }}>
                  R$ {lucroEstimado.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          </div>

          {/* Seção 4: Prévia das Alterações de Estoque (Transparência) */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              marginBottom: '6px'
            }}>
              <RotateCcw size={14} color="var(--primary)" />
              Impacto no Estoque com esta edição:
            </div>

            {stockDeltasPreview.length === 0 ? (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Nenhuma alteração de quantidade nos produtos (o estoque permanecerá igual).
              </span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {stockDeltasPreview.map((item, idx) => {
                  const isEstorno = item.delta > 0;
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        padding: '3px 0'
                      }}
                    >
                      <span style={{ color: 'var(--text-primary)' }}>
                        <strong>{item.nome}</strong>: {item.origQty} un. ➔ {item.newQty} un.
                      </span>
                      <span style={{
                        fontWeight: 700,
                        color: isEstorno ? '#10b981' : 'var(--warning)',
                        background: isEstorno ? 'rgba(16, 185, 129, 0.1)' : 'var(--warning-light)',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        {isEstorno ? `+${item.delta} estornará ao estoque` : `${item.delta} baixará do estoque`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rodapé de Ações */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            marginTop: '8px'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-strong)',
                color: 'var(--text-secondary)',
                padding: '10px 18px',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer'
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting || itens.length === 0}
              style={{
                background: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: (isSubmitting || itens.length === 0) ? 'not-allowed' : 'pointer',
                opacity: (isSubmitting || itens.length === 0) ? 0.6 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <Save size={16} />
              {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
