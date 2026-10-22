import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle2, 
  CreditCard, 
  Banknote, 
  QrCode, 
  Percent, 
  Sparkles, 
  ShoppingBag, 
  ArrowRight, 
  X, 
  Tag,
  Layers,
  ChevronDown,
  ChevronUp,
  Check
} from 'lucide-react';
import { createSale, addProduct, addCategory } from '../../services/firestoreService';
import { toast } from '../Common/ToastContainer';

// Funções para identificação de categorias dos descontos padrões
const normalizeCategoryName = (str) => {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

const isCartelaAdesivos = (catName, prodName = '') => {
  const normCat = normalizeCategoryName(catName);
  const normProd = normalizeCategoryName(prodName);
  if (normCat.includes('cartela') && normCat.includes('adesiv')) return true;
  if (normCat === 'cartela de adesivos' || normCat === 'cartelas de adesivos') return true;
  if (normCat.includes('adesiv') && normProd.includes('cartela')) return true;
  return false;
};

const isBottonsGrandes = (catName, prodName = '') => {
  const normCat = normalizeCategoryName(catName);
  const normProd = normalizeCategoryName(prodName);
  const catIsBoton = normCat.includes('boton') || normCat.includes('botton') || normCat.includes('botom');
  const catIsGrande = normCat.includes('grand') || normCat.includes(' g') || normCat.endsWith('g');
  if (catIsBoton && catIsGrande) return true;
  if (catIsBoton && (normProd.includes('grand') || normProd.includes('4.5') || normProd.includes('5.5') || normProd.includes('5cm') || normProd.includes('6cm'))) return true;
  return false;
};

const isBottonsPequenos = (catName, prodName = '') => {
  const normCat = normalizeCategoryName(catName);
  const normProd = normalizeCategoryName(prodName);
  const catIsBoton = normCat.includes('boton') || normCat.includes('botton') || normCat.includes('botom');
  const catIsPequeno = normCat.includes('pequen') || normCat.includes(' p') || normCat.endsWith('p');
  if (catIsBoton && catIsPequeno) return true;
  if (catIsBoton && (normProd.includes('pequen') || normProd.includes('3.5') || normProd.includes('3cm') || normProd.includes('2.5') || normProd.includes('4cm'))) return true;
  return false;
};

export default function PDVView({ 
  products, 
  categories, 
  collections = [],
  currentEvent, 
  user,
  onGoToProducts,
  onGoToEvents,
  isHeaderHidden = false,
  setIsHeaderHidden = () => {}
}) {
  // Estados da busca e categoria
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Carrinho da venda atual
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('val'); // 'val' (R$) ou 'pct' (%)
  const [paymentMethod, setPaymentMethod] = useState('pix'); // 'pix', 'dinheiro', 'debito', 'credito'
  const [notes, setNotes] = useState('');

  // Controle de desconto padrão automático
  const isManuallyEditedRef = useRef(false);
  const prevAutoDiscountRef = useRef(0);
  
  // Modal de sucesso ou finalização no mobile
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successSale, setSuccessSale] = useState(null);

  // Manipulação de scroll e touch para esconder/mostrar headers suavemente
  const productsScrollRef = useRef(null);
  const lastProductsScrollTopRef = useRef(0);
  const touchStartYRef = useRef(0);
  const isHeaderHiddenRef = useRef(isHeaderHidden);
  isHeaderHiddenRef.current = isHeaderHidden;

  const handleProductsScroll = (e) => {
    const currentScrollTop = e.currentTarget.scrollTop;
    const diff = currentScrollTop - lastProductsScrollTopRef.current;

    if (diff > 5) {
      // Scrollando para baixo: oculta headers imediatamente
      if (!isHeaderHiddenRef.current) {
        setIsHeaderHidden(true);
      }
    } else if (diff < -5) {
      // Scrollando para cima: só volta a exibir headers se estiver no topo da página
      if (currentScrollTop <= 5 && isHeaderHiddenRef.current) {
        setIsHeaderHidden(false);
      }
    }

    lastProductsScrollTopRef.current = currentScrollTop;
  };

  const handleTouchStart = (e) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartYRef.current;
    const scrollTop = e.currentTarget.scrollTop;

    if (deltaY < -15) {
      // Arrastou o dedo para cima (rolar para baixo): oculta headers imediatamente
      // Não depende de descer a lista de itens primeiro
      if (!isHeaderHiddenRef.current) {
        setIsHeaderHidden(true);
      }
    } else if (deltaY > 20) {
      // Arrastou o dedo para baixo (rolar para cima):
      // Reexibe o header apenas se estiver no topo da lista
      if (scrollTop <= 5 && isHeaderHiddenRef.current) {
        setIsHeaderHidden(false);
      }
    }
  };

  const handleWheel = (e) => {
    if (e.deltaY > 5) {
      if (!isHeaderHiddenRef.current) {
        setIsHeaderHidden(true);
      }
    } else if (e.deltaY < -5) {
      if (e.currentTarget.scrollTop <= 5 && isHeaderHiddenRef.current) {
        setIsHeaderHidden(false);
      }
    }
  };

  // Mapeamentos rápidos de ID para nome
  const categoryMap = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      map[c.id] = c.nome || '';
    });
    return map;
  }, [categories]);

  const productCategoryMap = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      map[p.id] = p.categoriaId || '';
    });
    return map;
  }, [products]);

  // Cálculo dos descontos padrões automáticos:
  // - 3 itens de "Cartela de adesivos" => - R$ 5
  // - 3 itens de "bottons grandes" => - R$ 5
  // - 5 itens de "bottons pequenos" => - R$ 5
  const autoDiscountAmount = useMemo(() => {
    let countCartelaAdesivos = 0;
    let countBottonsGrandes = 0;
    let countBottonsPequenos = 0;

    cart.forEach((item) => {
      const catId = item.categoriaId || productCategoryMap[item.produtoId];
      const catName = categoryMap[catId] || '';
      const prodName = item.nome || '';
      const qty = item.quantidade || 0;

      if (isCartelaAdesivos(catName, prodName)) {
        countCartelaAdesivos += qty;
      } else if (isBottonsGrandes(catName, prodName)) {
        countBottonsGrandes += qty;
      } else if (isBottonsPequenos(catName, prodName)) {
        countBottonsPequenos += qty;
      }
    });

    const descAdesivos = Math.floor(countCartelaAdesivos / 3) * 5;
    const descBottonsG = Math.floor(countBottonsGrandes / 3) * 5;
    const descBottonsP = Math.floor(countBottonsPequenos / 5) * 5;

    return descAdesivos + descBottonsG + descBottonsP;
  }, [cart, categoryMap, productCategoryMap]);

  // Aplica automaticamente o desconto padrão no campo
  useEffect(() => {
    if (cart.length === 0) {
      setDiscount(0);
      isManuallyEditedRef.current = false;
      prevAutoDiscountRef.current = 0;
      return;
    }

    if (autoDiscountAmount !== prevAutoDiscountRef.current) {
      if (!isManuallyEditedRef.current || autoDiscountAmount > prevAutoDiscountRef.current) {
        setDiscount(autoDiscountAmount);
        setDiscountType('val');
        isManuallyEditedRef.current = false;
      }
      prevAutoDiscountRef.current = autoDiscountAmount;
    }
  }, [autoDiscountAmount, cart.length]);

  // Alterna seleção múltipla de categorias
  const handleToggleCategory = (catId) => {
    setSelectedCategoryIds((prev) => {
      if (prev.includes(catId)) {
        return prev.filter((id) => id !== catId);
      } else {
        return [...prev, catId];
      }
    });
  };

  // Filtragem e ordenação alfabética dos produtos por padrão (apenas produtos ativos no PDV)
  const activeProducts = useMemo(() => {
    return products.filter((p) => p.ativo !== false);
  }, [products]);

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
  }, [categories]);

  // Agrupamento dos produtos por categoria para exibição dividida
  const groupedProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const searchedProducts = activeProducts.filter((p) => {
      return term === '' || (p.nome || '').toLowerCase().includes(term);
    });

    const activeCatIds = selectedCategoryIds.length === 0 ? null : new Set(selectedCategoryIds);

    const groups = [];

    sortedCategories.forEach((cat) => {
      if (activeCatIds && !activeCatIds.has(cat.id)) {
        return;
      }

      const catProds = searchedProducts
        .filter((p) => p.categoriaId === cat.id)
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));

      if (catProds.length > 0) {
        groups.push({
          id: cat.id,
          nome: cat.nome,
          products: catProds
        });
      }
    });

    // Produtos sem categoria ou com categoria excluída
    const uncategorizedProds = searchedProducts
      .filter((p) => !p.categoriaId || !categories.some((c) => c.id === p.categoriaId))
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));

    if (uncategorizedProds.length > 0 && (!activeCatIds || activeCatIds.has('uncategorized'))) {
      groups.push({
        id: 'uncategorized',
        nome: 'Outros',
        products: uncategorizedProds
      });
    }

    return groups;
  }, [activeProducts, searchTerm, selectedCategoryIds, sortedCategories, categories]);

  const totalMatchingProducts = useMemo(() => {
    return groupedProducts.reduce((acc, g) => acc + g.products.length, 0);
  }, [groupedProducts]);

  // Manipulação do Carrinho
  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.produtoId === product.id);
      if (existing) {
        return prev.map((item) => 
          item.produtoId === product.id 
            ? { ...item, quantidade: item.quantidade + 1, subtotal: (item.quantidade + 1) * item.precoUnitario }
            : item
        );
      }
      return [
        ...prev,
        {
          produtoId: product.id,
          nome: product.nome,
          precoUnitario: product.preco,
          precoCusto: product.precoCusto || 0,
          categoriaId: product.categoriaId || '',
          colecaoId: product.colecaoId || '',
          quantidade: 1,
          subtotal: product.preco
        }
      ];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.produtoId === productId) {
            const newQty = item.quantidade + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantidade: newQty,
              subtotal: newQty * item.precoUnitario
            };
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.produtoId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setNotes('');
    isManuallyEditedRef.current = false;
    prevAutoDiscountRef.current = 0;
  };

  // Cálculos financeiros
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.subtotal, 0);
  }, [cart]);

  const discountValue = useMemo(() => {
    const num = Number(discount) || 0;
    if (discountType === 'pct') {
      return Math.min(subtotal, (subtotal * num) / 100);
    }
    return Math.min(subtotal, num);
  }, [subtotal, discount, discountType]);

  const totalFinal = Math.max(0, subtotal - discountValue);
  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantidade, 0);

  // Finalizar a Venda no Firestore
  const handleFinalizeSale = async () => {
    if (cart.length === 0) return;
    if (!currentEvent) {
      toast.warning("Por favor, crie ou selecione um evento no topo antes de registrar a venda!");
      return;
    }

    try {
      setIsSubmitting(true);

      const salePayload = {
        eventoId: currentEvent.id,
        eventoNome: currentEvent.nome,
        itens: cart,
        subtotal: Number(subtotal.toFixed(2)),
        desconto: Number(discountValue.toFixed(2)),
        valorTotal: Number(totalFinal.toFixed(2)),
        formaPagamento: paymentMethod,
        observacoes: notes || "",
        criadoPor: user?.email || "vendedor"
      };

      const docRef = await createSale(salePayload);
      
      setSuccessSale({
        id: docRef.id,
        total: totalFinal,
        itemsCount: totalItemsCount,
        paymentMethod
      });

      toast.success("Venda registrada com sucesso!");
      clearCart();
      setIsMobileCartOpen(false);
    } catch (error) {
      console.error("Erro ao salvar venda:", error);
      toast.error("Houve um erro ao registrar a venda: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper para cadastrar dados de teste caso o Firestore esteja vazio
  const handleSeedDemoData = async () => {
    try {
      const catChaveiro = await addCategory("Chaveiros");
      const catAdesivo = await addCategory("Adesivos");
      const catBotons = await addCategory("Bótons");

      await addProduct({
        nome: "Chaveiro Acrílico Capivara",
        preco: 15.00,
        precoCusto: 4.50,
        categoriaId: catChaveiro.id
      });
      await addProduct({
        nome: "Chaveiro Resinado Gatinho",
        preco: 18.00,
        precoCusto: 5.00,
        categoriaId: catChaveiro.id
      });
      await addProduct({
        nome: "Cartela de Adesivos Holográficos",
        preco: 10.00,
        precoCusto: 2.20,
        categoriaId: catAdesivo.id
      });
      await addProduct({
        nome: "Bóton Metálico 4.5cm",
        preco: 7.00,
        precoCusto: 1.50,
        categoriaId: catBotons.id
      });
      toast.success("Produtos de teste adicionados com sucesso!");
    } catch (err) {
      toast.error("Erro ao adicionar exemplos: " + err.message);
    }
  };

  // Renderizador do Conteúdo do Carrinho (usado tanto no painel lateral quanto no modal mobile)
  const renderCartContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Cabeçalho do Carrinho */}
      <div 
        className="cart-header-section"
        style={{
          padding: isHeaderHidden ? '0 18px' : '14px 18px',
          maxHeight: isHeaderHidden ? '0px' : '65px',
          opacity: isHeaderHidden ? 0 : 1,
          overflow: 'hidden',
          pointerEvents: isHeaderHidden ? 'none' : 'auto',
          borderBottom: isHeaderHidden ? 'none' : '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.28s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingBag size={20} color="var(--primary)" />
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Venda Atual
          </h2>
          {totalItemsCount > 0 && (
            <span className="badge badge-primary">{totalItemsCount}</span>
          )}
        </div>

        {cart.length > 0 && (
          <button
            onClick={clearCart}
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px'
            }}
          >
            <Trash2 size={14} /> Limpar
          </button>
        )}
      </div>

      {/* Lista de Itens */}
      <div 
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        {cart.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-muted)',
            textAlign: 'center',
            padding: '20px'
          }}>
            <ShoppingBag size={48} strokeWidth={1.2} style={{ marginBottom: '12px', opacity: 0.4 }} />
            <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Carrinho vazio</p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>Toque nos produtos ao lado para adicionar à venda rápida.</p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.produtoId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: 'var(--bg-surface-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-strong)',
                gap: '10px'
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 600,
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {item.nome}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  R$ {item.precoUnitario.toFixed(2).replace('.', ',')} cada
                </div>
              </div>

              {/* Controles de Quantidade táteis grandes */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => updateQuantity(item.produtoId, -1)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface-hover)',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Minus size={14} />
                </button>

                <span style={{
                  minWidth: '24px',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '14px',
                  color: 'var(--text-primary)'
                }}>
                  {item.quantidade}
                </span>

                <button
                  onClick={() => updateQuantity(item.produtoId, 1)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface-hover)',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Subtotal do item */}
              <div style={{
                fontWeight: 700,
                fontSize: '14px',
                color: 'var(--text-primary)',
                minWidth: '65px',
                textAlign: 'right'
              }}>
                R$ {item.subtotal.toFixed(2).replace('.', ',')}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Seção de Fechamento / Pagamento */}
      {cart.length > 0 && (
        <div 
          className="cart-footer-section"
          style={{
            padding: '14px 18px',
            background: 'var(--bg-surface)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          {/* Desconto */}
          <div className={`cart-discount-row ${discountValue > 0 ? 'has-discount' : 'no-discount'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Percent size={14} /> Desconto:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => setDiscountType(discountType === 'val' ? 'pct' : 'val')}
                style={{
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 700,
                  background: 'var(--bg-surface-hover)',
                  color: 'var(--accent)'
                }}
              >
                {discountType === 'val' ? 'R$' : '%'}
              </button>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0,00"
                value={discount || ''}
                onChange={(e) => {
                  isManuallyEditedRef.current = true;
                  setDiscount(Math.max(0, Number(e.target.value)));
                }}
                style={{
                  width: '85px',
                  padding: '6px 8px',
                  textAlign: 'right',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          {/* Formas de Pagamento (Touch friendly) */}
          <div>
            <div className="cart-payment-title" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px' }}>
              FORMA DE PAGAMENTO
            </div>
            <div className="cart-payment-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {[
                { id: 'pix', label: 'Pix', icon: QrCode, color: '#0ea5e9' },
                { id: 'dinheiro', label: 'Dinheiro', icon: Banknote, color: '#f59e0b' },
                { id: 'debito', label: 'Débito', icon: CreditCard, color: '#3b82f6' },
                { id: 'credito', label: 'Crédito', icon: CreditCard, color: '#8b5cf6' }
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id)}
                    className="cart-payment-btn"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px 4px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? m.color : 'var(--bg-surface-elevated)',
                      color: isSelected ? '#fff' : 'var(--text-secondary)',
                      border: isSelected ? `1px solid ${m.color}` : '1px solid var(--border-strong)',
                      gap: '4px',
                      fontWeight: 600,
                      fontSize: '12px'
                    }}
                  >
                    <Icon size={16} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contêiner de Resumo Financeiro e Finalização */}
          <div className="cart-total-action-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Resumo Financeiro */}
            <div className="cart-total-box" style={{
              background: 'var(--bg-surface-elevated)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-strong)'
            }}>
              <div className="cart-subtotal-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span>Subtotal:</span>
                <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              {discountValue > 0 && (
                <div className="cart-discount-summary-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--danger)', marginTop: '3px' }}>
                  <span>Desconto aplicado:</span>
                  <span>- R$ {discountValue.toFixed(2).replace('.', ',')}</span>
                </div>
              )}
              <div className="cart-total-row" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginTop: discountValue > 0 ? '4px' : '6px',
                paddingTop: discountValue > 0 ? '4px' : '6px',
                borderTop: '1px solid var(--border-subtle)'
              }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>TOTAL A PAGAR:</span>
                <span className="total-value" style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)' }}>
                  R$ {totalFinal.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {/* Botão de Finalizar Venda */}
            <button
              onClick={handleFinalizeSale}
              disabled={isSubmitting}
              className="cart-checkout-btn"
              title="Finalizar Venda"
              style={{
                background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
                color: '#fff',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                fontWeight: 800,
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 4px 16px rgba(56, 189, 248, 0.4)',
                opacity: isSubmitting ? 0.7 : 1,
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer'
              }}
            >
              {isSubmitting ? (
                <span className="checkout-btn-text">Gravando...</span>
              ) : (
                <>
                  <span className="checkout-btn-text">FINALIZAR VENDA</span>
                  <ArrowRight size={20} className="checkout-btn-icon" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      display: 'flex',
      flex: 1,
      height: '100%',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* PAINEL ESQUERDO: CATÁLOGO DE PRODUTOS */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRight: '1px solid var(--border-subtle)',
        minWidth: 0
      }}>
        {/* Barra de Busca e Categorias */}
        <div 
          className="pdv-search-category-bar"
          style={{
            padding: isHeaderHidden ? '0 18px' : '10px 18px',
            maxHeight: isHeaderHidden ? '0px' : (isCategoriesExpanded ? '340px' : '140px'),
            opacity: isHeaderHidden ? 0 : 1,
            overflow: isCategoriesExpanded ? 'visible' : 'hidden',
            pointerEvents: isHeaderHidden ? 'none' : 'auto',
            borderBottom: isHeaderHidden ? 'none' : '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            background: 'var(--bg-surface)',
            transition: 'all 0.28s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {/* Busca Rápida */}
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
            <input
              type="text"
              placeholder="Buscar por nome do produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '38px',
                paddingRight: '12px',
                height: '40px',
                borderRadius: 'var(--radius-full)'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'transparent',
                  color: 'var(--text-muted)'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filtro por Categorias: Linha Única com Scroll ou Expandido em Grade */}
          <div style={{
            display: 'flex',
            alignItems: isCategoriesExpanded ? 'flex-start' : 'center',
            gap: '8px'
          }}>
            <div style={{
              flex: 1,
              display: 'flex',
              flexWrap: isCategoriesExpanded ? 'wrap' : 'nowrap',
              gap: '8px',
              overflowX: isCategoriesExpanded ? 'visible' : 'auto',
              overflowY: isCategoriesExpanded ? 'auto' : 'visible',
              maxHeight: isCategoriesExpanded ? '180px' : 'none',
              paddingBottom: '4px',
              scrollbarWidth: isCategoriesExpanded ? 'thin' : 'none',
              WebkitOverflowScrolling: 'touch'
            }}>
              <button
                type="button"
                onClick={() => setSelectedCategoryIds([])}
                style={{
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 600,
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  background: selectedCategoryIds.length === 0 ? 'var(--primary)' : 'var(--bg-surface-elevated)',
                  color: selectedCategoryIds.length === 0 ? '#fff' : 'var(--text-secondary)',
                  border: selectedCategoryIds.length === 0 ? '1px solid var(--primary)' : '1px solid var(--border-strong)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
              >
                Todos ({activeProducts.length})
              </button>

              {sortedCategories.map((cat) => {
                const isSelected = selectedCategoryIds.includes(cat.id);
                const count = activeProducts.filter(p => p.categoriaId === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleToggleCategory(cat.id)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 600,
                      fontSize: '13px',
                      whiteSpace: 'nowrap',
                      background: isSelected ? 'var(--primary)' : 'var(--bg-surface-elevated)',
                      color: isSelected ? '#fff' : 'var(--text-secondary)',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-strong)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      flexShrink: 0,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isSelected && <Check size={14} />}
                    <span>{cat.nome}</span>
                    <span style={{ fontSize: '11px', opacity: 0.8 }}>({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Botão de Expandir / Recolher Todas as Categorias */}
            <button
              type="button"
              onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
              title={isCategoriesExpanded ? "Recolher categorias para 1 linha" : "Mostrar todas as categorias"}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 12px',
                borderRadius: 'var(--radius-full)',
                fontWeight: 600,
                fontSize: '12px',
                background: isCategoriesExpanded ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-surface-elevated)',
                color: isCategoriesExpanded ? 'var(--primary)' : 'var(--text-secondary)',
                border: isCategoriesExpanded ? '1px solid var(--primary)' : '1px solid var(--border-strong)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                height: '35px',
                transition: 'all 0.15s ease'
              }}
            >
              {isCategoriesExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              <span>{isCategoriesExpanded ? 'Recolher' : 'Ver todas'}</span>
            </button>
          </div>
        </div>

        {/* Grade de Produtos (Otimizada para Tablet S6 Lite e Mobile) */}
        <div 
          ref={productsScrollRef}
          onScroll={handleProductsScroll}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onWheel={handleWheel}
          className="pdv-products-scroll"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px',
            paddingBottom: '90px' // ajustado via media query no mobile landscape
          }}
        >
          {products.length === 0 ? (
            /* Estado Inicial: Nenhum produto no Firestore */
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 20px',
              textAlign: 'center',
              gap: '16px'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)'
              }}>
                <Tag size={32} />
              </div>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Nenhum produto cadastrado ainda
                </h3>
                <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', fontSize: '14px' }}>
                  Sua coleção do Firestore está vazia. Você pode adicionar produtos manualmente ou carregar exemplos para testar a venda.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  onClick={handleSeedDemoData}
                  style={{
                    background: 'var(--accent)',
                    color: '#fff',
                    padding: '10px 18px',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Sparkles size={16} /> Carregar Produtos de Teste
                </button>

                <button
                  onClick={onGoToProducts}
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    color: '#fff',
                    border: '1px solid var(--border-strong)',
                    padding: '10px 18px',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 600
                  }}
                >
                  Ir para Cadastro de Produtos
                </button>
              </div>
            </div>
          ) : totalMatchingProducts === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Nenhum produto encontrado para o filtro selecionado.
            </div>
          ) : (
            <div>
              {groupedProducts.map((group) => (
                <div key={group.id} style={{ marginBottom: '24px' }}>
                  {/* Cabeçalho da Categoria */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '10px',
                    paddingBottom: '6px',
                    borderBottom: '1px solid var(--border-subtle)'
                  }}>
                    <div style={{
                      width: '4px',
                      height: '16px',
                      borderRadius: '2px',
                      background: 'var(--primary)'
                    }} />
                    <h3 style={{
                      fontSize: '15px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      margin: 0,
                      letterSpacing: '0.3px'
                    }}>
                      {group.nome}:
                    </h3>
                    <span style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      background: 'var(--bg-surface-elevated)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid var(--border-strong)'
                    }}>
                      {group.products.length} {group.products.length === 1 ? 'item' : 'itens'}
                    </span>
                  </div>

                  {/* Grade de Produtos da Categoria */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: '12px'
                  }}>
                    {group.products.map((product) => {
                      const itemInCart = cart.find(c => c.produtoId === product.id);
                      const qty = itemInCart ? itemInCart.quantidade : 0;

                      return (
                        <div
                          key={product.id}
                          onClick={() => addToCart(product)}
                          style={{
                            background: 'var(--bg-surface)',
                            borderRadius: 'var(--radius-md)',
                            border: qty > 0 ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                            padding: '14px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            position: 'relative',
                            cursor: 'pointer',
                            transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                            minHeight: '120px'
                          }}
                          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
                          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          {/* Badge de Quantidade no Carrinho */}
                          {qty > 0 && (
                            <div style={{
                              position: 'absolute',
                              top: '-8px',
                              right: '-8px',
                              background: 'var(--primary)',
                              color: '#fff',
                              borderRadius: 'var(--radius-full)',
                              minWidth: '24px',
                              height: '24px',
                              fontSize: '12px',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '0 6px',
                              boxShadow: '0 2px 8px rgba(56, 189, 248, 0.5)'
                            }}>
                              {qty}
                            </div>
                          )}

                          {/* Nome do Produto */}
                          <div>
                            <div style={{
                              fontWeight: 700,
                              fontSize: '15px',
                              color: 'var(--text-primary)',
                              lineHeight: '1.25',
                              marginBottom: '6px'
                            }}>
                              {product.nome}
                            </div>

                            {product.colecaoId && (
                              <div style={{
                                fontSize: '11px',
                                color: '#a855f7',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                marginBottom: '4px'
                              }}>
                                <Layers size={11} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {collections.find(c => c.id === product.colecaoId)?.nome || 'Coleção'}
                                </span>
                              </div>
                            )}
                            
                            {product.precoCusto > 0 && (
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                Custo: R$ {product.precoCusto.toFixed(2).replace('.', ',')}
                              </div>
                            )}

                            {/* Indicador de Estoque */}
                            <div style={{
                              fontSize: '11px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              marginTop: '3px'
                            }}>
                              <span style={{ color: 'var(--text-muted)' }}>Estoque:</span>
                              <span style={{
                                fontWeight: 700,
                                color: (product.estoque || 0) < 0 ? 'var(--danger)' : 'var(--text-secondary)'
                              }}>
                                {product.estoque ?? 0} un
                              </span>
                            </div>
                          </div>

                          {/* Preço de Venda e Botões de Quantidade */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: '10px'
                          }}>
                            <div style={{
                              fontWeight: 800,
                              fontSize: '17px',
                              color: 'var(--primary)'
                            }}>
                              R$ {product.preco.toFixed(2).replace('.', ',')}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {qty > 0 && (
                                <button
                                  type="button"
                                  title="Remover 1 unidade do carrinho"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateQuantity(product.id, -1);
                                  }}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onTouchStart={(e) => e.stopPropagation()}
                                  style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: 'var(--radius-full)',
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid rgba(239, 68, 68, 0.35)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <Minus size={15} />
                                </button>
                              )}

                              <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: 'var(--radius-full)',
                                background: qty > 0 ? 'var(--primary)' : 'var(--bg-surface-elevated)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: qty > 0 ? '#fff' : 'var(--text-primary)',
                                boxShadow: qty > 0 ? '0 2px 6px rgba(56, 189, 248, 0.35)' : 'none',
                                transition: 'all 0.15s ease'
                              }}>
                                <Plus size={16} />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PAINEL DIREITO: TICKET DA VENDA (VISÍVEL NO TABLET S6 LITE LANDSCAPE E COMPUTADOR) */}
      <aside style={{
        width: '380px',
        maxWidth: '40%',
        background: 'var(--bg-surface)',
        display: 'none', // habilitado via media query ou inline abaixo
        flexDirection: 'column'
      }} className="desktop-cart-panel">
        {renderCartContent()}
      </aside>

      {/* BARRA FLUTUANTE INFERIOR (CELULARES E TABLET EM MODO RETRATO) */}
      {cart.length > 0 && (
        <div 
          onClick={() => setIsMobileCartOpen(true)}
          className="mobile-cart-bar"
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            right: '12px',
            background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
            color: '#fff',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 8px 24px rgba(56, 189, 248, 0.45)',
            cursor: 'pointer',
            zIndex: 30
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'rgba(0,0,0,0.2)',
              borderRadius: 'var(--radius-full)',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800
            }}>
              {totalItemsCount}
            </div>
            <div>
              <div style={{ fontSize: '13px', opacity: 0.9 }}>Toque para fechar a venda</div>
              <div style={{ fontSize: '18px', fontWeight: 800 }}>
                R$ {totalFinal.toFixed(2).replace('.', ',')}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '14px' }}>
            <span>Pagar</span>
            <ArrowRight size={18} />
          </div>
        </div>
      )}

      {/* MODAL / BOTTOM SHEET MOBILE PARA FINALIZAR VENDA */}
      {isMobileCartOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end'
        }}>
          <div 
            onClick={() => setIsMobileCartOpen(false)}
            style={{ flex: 1 }} 
          />
          <div style={{
            background: 'var(--bg-surface)',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            height: '85vh',
            maxHeight: '750px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid var(--border-strong)',
            position: 'relative'
          }} className="animate-slide-up">
            <button
              onClick={() => setIsMobileCartOpen(false)}
              style={{
                position: 'absolute',
                top: '14px',
                right: '16px',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-secondary)',
                borderRadius: 'var(--radius-full)',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10
              }}
            >
              <X size={18} />
            </button>
            {renderCartContent()}
          </div>
        </div>
      )}

      {/* MODAL DE SUCESSO DA VENDA */}
      {successSale && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(5px)',
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: '24px',
            padding: '32px 24px',
            maxWidth: '380px',
            width: '100%',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }} className="animate-fade-in">
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle2 size={44} />
            </div>

            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Venda Registrada!
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                Salva com sucesso no Firebase
              </p>
            </div>

            <div style={{
              background: 'var(--bg-surface-elevated)',
              padding: '14px 20px',
              borderRadius: 'var(--radius-md)',
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                {successSale.paymentMethod.toUpperCase()} ({successSale.itemsCount} itens)
              </span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)' }}>
                R$ {successSale.total.toFixed(2).replace('.', ',')}
              </span>
            </div>

            <button
              onClick={() => setSuccessSale(null)}
              style={{
                width: '100%',
                background: 'var(--primary)',
                color: '#fff',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                fontSize: '16px'
              }}
            >
              Nova Venda (Próximo Cliente)
            </button>
          </div>
        </div>
      )}

      {/* ESTILOS ESPECÍFICOS DE RESPONSIVIDADE (TABLET VS CELULAR DE LADO VS CELULAR EM PÉ) */}
      <style>{`
        /* TABLET DE LADO E COMPUTADOR (min-width: 900px) */
        @media (min-width: 900px) {
          .desktop-cart-panel {
            display: flex !important;
          }
          .mobile-cart-bar {
            display: none !important;
          }
          .pdv-products-scroll {
            padding-bottom: 16px !important;
          }
        }

        /* CELULAR DE LADO (LANDSCAPE EM SMARTPHONES, Ex: Galaxy A55 800x360) */
        @media (orientation: landscape) and (max-height: 550px), (orientation: landscape) and (max-width: 899px) {
          .desktop-cart-panel {
            display: flex !important;
            width: 48% !important;
            max-width: 50% !important;
            min-width: 300px !important;
            border-left: 1px solid var(--border-subtle);
          }
          .mobile-cart-bar {
            display: none !important;
          }
          .pdv-products-scroll {
            padding-bottom: 14px !important;
          }
        }

        /* COMPACTAÇÃO VISUAL ESPECÍFICA PARA CELULAR DEITADO (max-height: 520px) */
        @media (max-height: 520px) {
          .cart-footer-section {
            padding: 6px 10px !important;
            gap: 5px !important;
          }

          /* 1. Botões de pix, dinheiro, débito e crédito sem ícone */
          .cart-payment-btn svg {
            display: none !important;
          }
          .cart-payment-btn {
            padding: 6px 2px !important;
            font-size: 11px !important;
            flex-direction: row !important;
            min-height: 32px !important;
          }
          .cart-payment-grid {
            gap: 4px !important;
          }

          /* 2. "Forma de pagamento" (a escrita, não os botões) some */
          .cart-payment-title {
            display: none !important;
          }

          /* 3. Subtotal desaparece */
          .cart-subtotal-row {
            display: none !important;
          }

          /* 4. Desconto só aparece se for maior que 0 */
          .cart-discount-row.no-discount {
            display: none !important;
          }
          .cart-discount-row {
            padding: 2px 0 !important;
            margin: 0 !important;
          }

          /* 5. Finalizar compra fica na mesma linha que o total, à direita, virando um botão quadrado com uma setinha, sem escrita */
          .cart-total-action-container {
            display: flex !important;
            flex-direction: row !important;
            align-items: stretch !important;
            gap: 8px !important;
          }

          .cart-total-action-container .cart-total-box {
            flex: 1 !important;
            padding: 4px 8px !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            margin: 0 !important;
          }

          .cart-total-action-container .cart-total-row {
            margin-top: 0 !important;
            padding-top: 0 !important;
            border-top: none !important;
          }

          .cart-total-box .total-value {
            font-size: 17px !important;
          }

          .cart-checkout-btn {
            width: 48px !important;
            min-width: 48px !important;
            max-width: 48px !important;
            height: auto !important;
            min-height: 44px !important;
            padding: 0 !important;
            border-radius: var(--radius-md) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            box-shadow: none !important;
            flex-shrink: 0 !important;
          }

          .cart-checkout-btn .checkout-btn-text {
            display: none !important;
          }

          .cart-checkout-btn .checkout-btn-icon {
            width: 22px !important;
            height: 22px !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
