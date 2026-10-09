import React, { useState, useMemo } from 'react';
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
  Tag
} from 'lucide-react';
import { createSale, addProduct, addCategory } from '../../services/firestoreService';

export default function PDVView({ 
  products, 
  categories, 
  currentEvent, 
  user,
  onGoToProducts,
  onGoToEvents
}) {
  // Estados da busca e categoria
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Carrinho da venda atual
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('val'); // 'val' (R$) ou 'pct' (%)
  const [paymentMethod, setPaymentMethod] = useState('pix'); // 'pix', 'dinheiro', 'debito', 'credito'
  const [notes, setNotes] = useState('');
  
  // Modal de sucesso ou finalização no mobile
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successSale, setSuccessSale] = useState(null);

  // Filtragem dos produtos
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory = selectedCategory === 'ALL' || p.categoriaId === selectedCategory;
      const matchSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, searchTerm]);

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
      alert("Por favor, crie ou selecione um evento no topo antes de registrar a venda!");
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

      clearCart();
      setIsMobileCartOpen(false);
    } catch (error) {
      console.error("Erro ao salvar venda:", error);
      alert("Houve um erro ao registrar a venda no Firebase: " + error.message);
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
    } catch (err) {
      alert("Erro ao adicionar exemplos: " + err.message);
    }
  };

  // Renderizador do Conteúdo do Carrinho (usado tanto no painel lateral quanto no modal mobile)
  const renderCartContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Cabeçalho do Carrinho */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingBag size={20} color="var(--primary)" />
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#fff' }}>
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
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
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
                  color: '#fff',
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
                    color: '#fff',
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
                  fontSize: '14px'
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
                    color: '#fff',
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
        <div style={{
          padding: '16px 20px',
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* Desconto */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
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
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
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
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              FORMA DE PAGAMENTO
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
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
                    <Icon size={18} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resumo Financeiro */}
          <div style={{
            background: 'var(--bg-surface-elevated)',
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-strong)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <span>Subtotal:</span>
              <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
            </div>
            {discountValue > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--danger)', marginTop: '4px' }}>
                <span>Desconto aplicado:</span>
                <span>- R$ {discountValue.toFixed(2).replace('.', ',')}</span>
              </div>
            )}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '1px solid var(--border-subtle)'
            }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>TOTAL A PAGAR:</span>
              <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>
                R$ {totalFinal.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>

          {/* Botão Gigante de Finalizar Venda */}
          <button
            onClick={handleFinalizeSale}
            disabled={isSubmitting}
            style={{
              background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
              color: '#fff',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 800,
              fontSize: '17px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 16px rgba(56, 189, 248, 0.4)',
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            {isSubmitting ? (
              <span>Gravando no Firebase...</span>
            ) : (
              <>
                <span>FINALIZAR VENDA</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      display: 'flex',
      flex: 1,
      height: 'calc(100dvh - 65px)',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* PAINEL ESQUERDO: CATÁLOGO DE PRODUTOS */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRight: '1px solid var(--border-subtle)'
      }}>
        {/* Barra de Busca e Categorias */}
        <div style={{
          padding: '12px 18px',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
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
                height: '42px',
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

          {/* Filtro por Categorias (Scroll Horizontal Suave) */}
          <div style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '4px',
            scrollbarWidth: 'none'
          }}>
            <button
              onClick={() => setSelectedCategory('ALL')}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-full)',
                fontWeight: 600,
                fontSize: '13px',
                whiteSpace: 'nowrap',
                background: selectedCategory === 'ALL' ? 'var(--primary)' : 'var(--bg-surface-elevated)',
                color: selectedCategory === 'ALL' ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--border-strong)'
              }}
            >
              Todos ({products.length})
            </button>

            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const count = products.filter(p => p.categoriaId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-full)',
                    fontWeight: 600,
                    fontSize: '13px',
                    whiteSpace: 'nowrap',
                    background: isSelected ? 'var(--primary)' : 'var(--bg-surface-elevated)',
                    color: isSelected ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid var(--border-strong)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>{cat.nome}</span>
                  <span style={{ fontSize: '11px', opacity: 0.8 }}>({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Grade de Produtos (Otimizada para Tablet S6 Lite e Mobile) */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          paddingBottom: '90px' // espaço para a barra mobile
        }}>
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
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
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
          ) : filteredProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Nenhum produto encontrado para o filtro selecionado.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              // 2 colunas no celular, 3 ou 4 colunas no Tablet S6 Lite (10.4")
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '12px'
            }}>
              {filteredProducts.map((product) => {
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
                        color: '#fff',
                        lineHeight: '1.25',
                        marginBottom: '6px'
                      }}>
                        {product.nome}
                      </div>
                      
                      {product.precoCusto > 0 && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Custo: R$ {product.precoCusto.toFixed(2).replace('.', ',')}
                        </div>
                      )}
                    </div>

                    {/* Preço de Venda e Botão Adicionar */}
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

                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--bg-surface-elevated)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-primary)'
                      }}>
                        <Plus size={16} />
                      </div>
                    </div>
                  </div>
                );
              })}
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
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff' }}>
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

      {/* ESTILOS ESPECÍFICOS DE RESPONSIVIDADE (TABLET S6 LITE VS MOBILE) */}
      <style>{`
        /* Tablet S6 Lite Landscape (10.4" ~ 960px a 1280px) e Computador */
        @media (min-width: 900px) {
          .desktop-cart-panel {
            display: flex !important;
          }
          .mobile-cart-bar {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
