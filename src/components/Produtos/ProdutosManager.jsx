import React, { useState } from 'react';
import { 
  Package, 
  Plus, 
  Trash2, 
  Edit3, 
  Tag, 
  Layers, 
  X,
  Check,
  AlertCircle
} from 'lucide-react';
import { 
  addProduct, 
  updateProduct, 
  deleteProduct,
  addCategory, 
  updateCategory, 
  deleteCategory 
} from '../../services/firestoreService';

export default function ProdutosManager({ products, categories }) {
  // Aba interna: 'produtos' ou 'categorias'
  const [activeSection, setActiveSection] = useState('produtos');

  // Modal Produto
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Campos do Produto
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [precoCusto, setPrecoCusto] = useState('');
  const [categoriaId, setCategoriaId] = useState('');

  // Gestão de Categorias
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [newCatInput, setNewCatInput] = useState('');

  // Funções de Produto
  const openNewModal = () => {
    setEditingProduct(null);
    setNome('');
    setPreco('');
    setPrecoCusto('');
    setCategoriaId(categories[0]?.id || '');
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setNome(product.nome);
    setPreco(String(product.preco));
    setPrecoCusto(product.precoCusto ? String(product.precoCusto) : '');
    setCategoriaId(product.categoriaId || categories[0]?.id || '');
    setIsModalOpen(true);
  };

  // Trata o preço para garantir que "15" seja exatamente 15.00 e nunca 14.99
  const parseCurrencyInput = (val) => {
    if (!val) return 0;
    // Substitui vírgula por ponto se digitado no formato brasileiro
    const normalized = String(val).replace(',', '.').trim();
    const num = parseFloat(normalized);
    if (isNaN(num)) return 0;
    return Math.round(num * 100) / 100;
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const parsedPreco = parseCurrencyInput(preco);
    const parsedCusto = parseCurrencyInput(precoCusto);

    if (!nome.trim() || parsedPreco <= 0) {
      alert("Informe o nome do produto e um preço válido (ex: 15 ou 15,00)!");
      return;
    }

    try {
      const payload = {
        nome: nome.trim(),
        preco: parsedPreco,
        precoCusto: parsedCusto,
        categoriaId: categoriaId || ""
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
      } else {
        await addProduct(payload);
      }

      setIsModalOpen(false);
    } catch (err) {
      alert("Erro ao salvar produto: " + err.message);
    }
  };

  const handleDeleteProduct = async (prodId, prodNome) => {
    if (window.confirm(`Tem certeza que deseja excluir o produto "${prodNome}"?`)) {
      try {
        await deleteProduct(prodId);
      } catch (err) {
        alert("Erro ao excluir produto: " + err.message);
      }
    }
  };

  // Funções de Categoria
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatInput.trim()) return;
    try {
      await addCategory(newCatInput.trim());
      setNewCatInput('');
    } catch (err) {
      alert("Erro ao adicionar categoria: " + err.message);
    }
  };

  const handleSaveCatEdit = async (catId) => {
    if (!editingCatName.trim()) return;
    try {
      await updateCategory(catId, editingCatName.trim());
      setEditingCatId(null);
    } catch (err) {
      alert("Erro ao renomear categoria: " + err.message);
    }
  };

  const handleDeleteCategory = async (catId, catNome) => {
    const productsInCat = products.filter(p => p.categoriaId === catId);
    let msg = `Tem certeza que deseja excluir a categoria "${catNome}"?`;
    if (productsInCat.length > 0) {
      msg = `ATENÇÃO: Existem ${productsInCat.length} produto(s) vinculados a "${catNome}". Deseja realmente excluir a categoria?`;
    }

    if (window.confirm(msg)) {
      try {
        await deleteCategory(catId);
      } catch (err) {
        alert("Erro ao excluir categoria: " + err.message);
      }
    }
  };

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '20px',
      maxWidth: '1050px',
      margin: '0 auto',
      width: '100%'
    }}>
      {/* Topo com Alternador de Seção */}
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
            Catálogo & Categorias
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
            Gerencie preços, custos, produtos e categorias da Crodiloja
          </p>
        </div>

        {/* Abas Superiores */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{
            display: 'flex',
            background: 'var(--bg-surface-elevated)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-strong)'
          }}>
            <button
              onClick={() => setActiveSection('produtos')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: 600,
                background: activeSection === 'produtos' ? 'var(--primary)' : 'transparent',
                color: activeSection === 'produtos' ? '#fff' : 'var(--text-secondary)'
              }}
            >
              Produtos ({products.length})
            </button>
            <button
              onClick={() => setActiveSection('categorias')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: 600,
                background: activeSection === 'categorias' ? 'var(--primary)' : 'transparent',
                color: activeSection === 'categorias' ? '#fff' : 'var(--text-secondary)'
              }}
            >
              Categorias ({categories.length})
            </button>
          </div>

          {activeSection === 'produtos' && (
            <button
              onClick={openNewModal}
              style={{
                background: 'var(--primary)',
                color: '#fff',
                padding: '10px 16px',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={16} /> Novo Produto
            </button>
          )}
        </div>
      </div>

      {/* SEÇÃO 1: LISTA DE PRODUTOS */}
      {activeSection === 'produtos' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '12px'
        }}>
          {products.length === 0 ? (
            <div style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '60px 20px',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)'
            }}>
              <Package size={48} strokeWidth={1.2} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Nenhum produto cadastrado</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                Clique no botão "Novo Produto" acima para cadastrar seu primeiro item.
              </p>
            </div>
          ) : (
            products.map((p) => {
              const categoryName = categories.find(c => c.id === p.categoriaId)?.nome || 'Sem Categoria';
              const margemLucro = p.preco > 0 && p.precoCusto > 0
                ? (((p.preco - p.precoCusto) / p.preco) * 100).toFixed(0)
                : null;

              return (
                <div
                  key={p.id}
                  style={{
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span className="badge badge-primary">{categoryName}</span>
                      {margemLucro && (
                        <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 700 }}>
                          Lucro: {margemLucro}%
                        </span>
                      )}
                    </div>

                    <div style={{ fontWeight: 700, fontSize: '16px', color: '#fff', lineHeight: '1.3' }}>
                      {p.nome}
                    </div>
                  </div>

                  {/* Informações de Preço e Ações */}
                  <div style={{
                    background: 'var(--bg-surface-elevated)',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PREÇO VENDA</div>
                      <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--primary)' }}>
                        R$ {p.preco.toFixed(2).replace('.', ',')}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CUSTO</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        R$ {(p.precoCusto || 0).toFixed(2).replace('.', ',')}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={() => openEditModal(p)}
                        style={{
                          background: 'var(--bg-surface-hover)',
                          color: '#fff',
                          padding: '8px',
                          borderRadius: 'var(--radius-sm)'
                        }}
                        title="Editar produto"
                      >
                        <Edit3 size={15} />
                      </button>

                      <button
                        onClick={() => handleDeleteProduct(p.id, p.nome)}
                        style={{
                          background: 'var(--danger-light)',
                          color: 'var(--danger)',
                          padding: '8px',
                          borderRadius: 'var(--radius-sm)'
                        }}
                        title="Excluir produto"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SEÇÃO 2: GERENCIAMENTO DE CATEGORIAS */}
      {activeSection === 'categorias' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
          {/* Adicionar Nova Categoria */}
          <form onSubmit={handleAddCategory} style={{
            background: 'var(--bg-surface)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            gap: '8px'
          }}>
            <input
              type="text"
              required
              placeholder="Nome da nova categoria (ex: Chaveiros, Canecas...)"
              value={newCatInput}
              onChange={(e) => setNewCatInput(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              style={{
                background: 'var(--primary)',
                color: '#fff',
                padding: '0 18px',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={16} /> Adicionar
            </button>
          </form>

          {/* Lista de Categorias */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {categories.map((cat) => {
              const isEditing = editingCatId === cat.id;
              const count = products.filter(p => p.categoriaId === cat.id).length;

              return (
                <div
                  key={cat.id}
                  style={{
                    background: 'var(--bg-surface)',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}
                >
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                      <input
                        type="text"
                        value={editingCatName}
                        onChange={(e) => setEditingCatName(e.target.value)}
                        autoFocus
                        style={{ flex: 1, padding: '6px 10px' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveCatEdit(cat.id)}
                        style={{
                          background: 'var(--primary)',
                          color: '#fff',
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        <Check size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCatId(null)}
                        style={{
                          background: 'var(--bg-surface-elevated)',
                          color: 'var(--text-secondary)',
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: '15px', color: '#fff' }}>
                          {cat.nome}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                          ({count} produtos)
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCatId(cat.id);
                            setEditingCatName(cat.nome);
                          }}
                          title="Alterar nome da categoria"
                          style={{
                            background: 'var(--bg-surface-elevated)',
                            color: '#fff',
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-sm)'
                          }}
                        >
                          <Edit3 size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id, cat.nome)}
                          title="Excluir categoria"
                          style={{
                            background: 'var(--danger-light)',
                            color: 'var(--danger)',
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-sm)'
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE PRODUTO */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 60,
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
            maxWidth: '440px',
            width: '100%'
          }} className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Chaveiro Capivara Acrílico"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Categoria
                </label>
                <select
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">Selecione uma categoria...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id} style={{ background: '#1f2937' }}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Preço de Venda (R$) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="Ex: 15 ou 15,00"
                    value={preco}
                    onChange={(e) => setPreco(e.target.value)}
                    style={{ width: '100%', fontWeight: 700 }}
                  />
                  {preco && (
                    <div style={{ fontSize: '11px', color: 'var(--primary)', marginTop: '4px' }}>
                      Registra: R$ {parseCurrencyInput(preco).toFixed(2).replace('.', ',')}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Preço de Custo (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 4,50"
                    value={precoCusto}
                    onChange={(e) => setPrecoCusto(e.target.value)}
                    style={{ width: '100%' }}
                  />
                  {precoCusto && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Custo: R$ {parseCurrencyInput(precoCusto).toFixed(2).replace('.', ',')}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                style={{
                  background: 'var(--primary)',
                  color: '#fff',
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: '15px',
                  marginTop: '10px'
                }}
              >
                {editingProduct ? 'Atualizar Produto' : 'Cadastrar Produto'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
