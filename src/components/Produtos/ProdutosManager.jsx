import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Trash2, 
  Edit3, 
  Tag, 
  Layers, 
  X, 
  Check, 
  AlertCircle,
  Search,
  Minus,
  AlertTriangle,
  TrendingUp,
  Box,
  RotateCcw
} from 'lucide-react';
import { 
  addProduct, 
  updateProduct, 
  deleteProduct, 
  addCategory, 
  updateCategory, 
  deleteCategory, 
  addCollectionDoc, 
  updateCollectionDoc, 
  deleteCollectionDoc,
  toggleProductActive,
  updateProductStock,
  replenishStockBatch
} from '../../services/firestoreService';
import { toast } from '../Common/ToastContainer';
import { confirmDialog } from '../Common/ConfirmModal';
import MultiSelectDropdown from '../Common/MultiSelectDropdown';

// Helpers para formatação de moeda em tempo real no próprio campo
const parseCurrencyInput = (val) => {
  if (!val) return 0;
  const normalized = String(val)
    .replace('R$', '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  const num = parseFloat(normalized);
  if (isNaN(num)) return 0;
  return Math.round(num * 100) / 100;
};

const formatCurrencyDisplay = (numOrStr) => {
  if (numOrStr === '' || numOrStr === null || numOrStr === undefined) return '';
  const num = typeof numOrStr === 'number' ? numOrStr : parseCurrencyInput(numOrStr);
  return `R$ ${num.toFixed(2).replace('.', ',')}`;
};

const handleCurrencyInputChange = (val, setter) => {
  const digits = String(val).replace(/\D/g, '');
  if (!digits) {
    setter('');
    return;
  }
  const num = parseInt(digits, 10) / 100;
  setter(`R$ ${num.toFixed(2).replace('.', ',')}`);
};

// Helper para agrupar produtos por Categoria e Coleção (ou vice-versa)
const groupProducts = (productList, categoriesList, collectionsList, groupBy = 'categoria') => {
  const categoryMap = new Map();
  categoriesList.forEach(c => categoryMap.set(c.id, c.nome));

  const collectionMap = new Map();
  collectionsList.forEach(c => collectionMap.set(c.id, c.nome));

  if (groupBy === 'categoria') {
    const catKeys = [...categoriesList.map(c => ({ id: c.id, nome: c.nome }))];
    const hasUncat = productList.some(p => !p.categoriaId || !categoryMap.has(p.categoriaId));
    if (hasUncat) {
      catKeys.push({ id: '__sem_categoria__', nome: 'Sem Categoria' });
    }

    const groups = [];

    catKeys.forEach(cat => {
      const prodsInCat = productList.filter(p => {
        if (cat.id === '__sem_categoria__') {
          return !p.categoriaId || !categoryMap.has(p.categoriaId);
        }
        return p.categoriaId === cat.id;
      });

      if (prodsInCat.length === 0) return;

      const colKeys = [...collectionsList.map(c => ({ id: c.id, nome: c.nome }))];
      const hasUncol = prodsInCat.some(p => !p.colecaoId || !collectionMap.has(p.colecaoId));
      if (hasUncol) {
        colKeys.push({ id: '__sem_colecao__', nome: 'Geral / Sem Coleção' });
      }

      const subgroups = [];
      colKeys.forEach(col => {
        const prodsInCol = prodsInCat.filter(p => {
          if (col.id === '__sem_colecao__') {
            return !p.colecaoId || !collectionMap.has(p.colecaoId);
          }
          return p.colecaoId === col.id;
        });

        if (prodsInCol.length > 0) {
          subgroups.push({
            id: col.id,
            nome: col.nome,
            products: prodsInCol
          });
        }
      });

      groups.push({
        id: cat.id,
        nome: cat.nome,
        totalCount: prodsInCat.length,
        subgroups
      });
    });

    return groups;
  } else {
    const colKeys = [...collectionsList.map(c => ({ id: c.id, nome: c.nome }))];
    const hasUncol = productList.some(p => !p.colecaoId || !collectionMap.has(p.colecaoId));
    if (hasUncol) {
      colKeys.push({ id: '__sem_colecao__', nome: 'Geral / Sem Coleção' });
    }

    const groups = [];

    colKeys.forEach(col => {
      const prodsInCol = productList.filter(p => {
        if (col.id === '__sem_colecao__') {
          return !p.colecaoId || !collectionMap.has(p.colecaoId);
        }
        return p.colecaoId === col.id;
      });

      if (prodsInCol.length === 0) return;

      const catKeys = [...categoriesList.map(c => ({ id: c.id, nome: c.nome }))];
      const hasUncat = prodsInCol.some(p => !p.categoriaId || !categoryMap.has(p.categoriaId));
      if (hasUncat) {
        catKeys.push({ id: '__sem_categoria__', nome: 'Sem Categoria' });
      }

      const subgroups = [];
      catKeys.forEach(cat => {
        const prodsInCat = prodsInCol.filter(p => {
          if (cat.id === '__sem_categoria__') {
            return !p.categoriaId || !categoryMap.has(p.categoriaId);
          }
          return p.categoriaId === cat.id;
        });

        if (prodsInCat.length > 0) {
          subgroups.push({
            id: cat.id,
            nome: cat.nome,
            products: prodsInCat
          });
        }
      });

      groups.push({
        id: col.id,
        nome: col.nome,
        totalCount: prodsInCol.length,
        subgroups
      });
    });

    return groups;
  }
};

export default function ProdutosManager({ products = [], categories = [], collections = [] }) {
  // Aba interna: 'produtos', 'estoque', 'categorias' ou 'colecoes'
  const [activeSection, setActiveSection] = useState('produtos');

  // Modal Produto
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Campos do Produto
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [precoCusto, setPrecoCusto] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [colecaoId, setColecaoId] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [estoque, setEstoque] = useState('0');

  // Filtros avançados para a lista de produtos (múltipla seleção)
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilters, setProductCategoryFilters] = useState([]); // array de IDs de categorias
  const [productCollectionFilters, setProductCollectionFilters] = useState([]); // array de IDs de coleções
  const [productGroupBy, setProductGroupBy] = useState('categoria'); // 'categoria' ou 'colecao'

  // Gestão de Categorias
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [newCatInput, setNewCatInput] = useState('');
  const [categorySearch, setCategorySearch] = useState(''); // Pesquisa em categorias existentes

  // Gestão de Coleções
  const [editingColId, setEditingColId] = useState(null);
  const [editingColName, setEditingColName] = useState('');
  const [newColInput, setNewColInput] = useState('');
  const [collectionSearch, setCollectionSearch] = useState(''); // Pesquisa em coleções existentes

  // Gestão de Estoque (múltipla seleção)
  const [stockSearch, setStockSearch] = useState('');
  const [stockFilters, setStockFilters] = useState([]); // Array combinável: 'ativos', 'inativos', 'com_estoque', 'zerados', 'negativos'
  const [stockCategoryFilters, setStockCategoryFilters] = useState([]); // array de IDs de categorias
  const [stockCollectionFilters, setStockCollectionFilters] = useState([]); // array de IDs de coleções
  const [stockGroupBy, setStockGroupBy] = useState('categoria'); // 'categoria' ou 'colecao'
  const [editingStockId, setEditingStockId] = useState(null);
  const [editingStockVal, setEditingStockVal] = useState('');

  // Modal de Reposição em Lote (múltipla seleção)
  const [isReplenishModalOpen, setIsReplenishModalOpen] = useState(false);
  const [replenishSearch, setReplenishSearch] = useState('');
  const [replenishCategoryFilters, setReplenishCategoryFilters] = useState([]); // array de IDs de categorias
  const [replenishCollectionFilters, setReplenishCollectionFilters] = useState([]); // array de IDs de coleções
  const [replenishGroupBy, setReplenishGroupBy] = useState('categoria'); // 'categoria' ou 'colecao'
  const [replenishMap, setReplenishMap] = useState({}); // { [productId]: number }
  const [isReplenishing, setIsReplenishing] = useState(false);

  // Ordenação alfabética por padrão
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
  }, [products]);

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
  }, [categories]);

  const sortedCollections = useMemo(() => {
    return [...collections].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
  }, [collections]);

  // Opções para os componentes MultiSelectDropdown
  const categorySelectOptions = useMemo(() => [
    ...sortedCategories.map(c => ({ id: c.id, label: c.nome })),
    { id: '__sem_categoria__', label: 'Sem categoria' }
  ], [sortedCategories]);

  const collectionSelectOptions = useMemo(() => [
    ...sortedCollections.map(c => ({ id: c.id, label: c.nome })),
    { id: '__sem_colecao__', label: 'Sem coleção' }
  ], [sortedCollections]);

  // Listas filtradas pela pesquisa em Categorias e Coleções
  const filteredCategoriesList = useMemo(() => {
    if (!categorySearch.trim()) return sortedCategories;
    const term = categorySearch.toLowerCase().trim();
    return sortedCategories.filter(c => (c.nome || '').toLowerCase().includes(term));
  }, [sortedCategories, categorySearch]);

  const filteredCollectionsList = useMemo(() => {
    if (!collectionSearch.trim()) return sortedCollections;
    const term = collectionSearch.toLowerCase().trim();
    return sortedCollections.filter(c => (c.nome || '').toLowerCase().includes(term));
  }, [sortedCollections, collectionSearch]);

  const productFilteredList = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    return sortedProducts.filter((p) => {
      const matchName = !term || (p.nome || '').toLowerCase().includes(term);

      let matchCat = true;
      if (productCategoryFilters.length > 0) {
        matchCat = productCategoryFilters.some(cf => cf === '__sem_categoria__' ? !p.categoriaId : p.categoriaId === cf);
      }

      let matchCol = true;
      if (productCollectionFilters.length > 0) {
        matchCol = productCollectionFilters.some(cf => cf === '__sem_colecao__' ? !p.colecaoId : p.colecaoId === cf);
      }

      return matchName && matchCat && matchCol;
    });
  }, [sortedProducts, productSearch, productCategoryFilters, productCollectionFilters]);

  const productGrouped = useMemo(() => {
    return groupProducts(productFilteredList, sortedCategories, sortedCollections, productGroupBy);
  }, [productFilteredList, sortedCategories, sortedCollections, productGroupBy]);

  // Funções de Produto
  const openNewModal = () => {
    setEditingProduct(null);
    setNome('');
    setPreco('');
    setPrecoCusto('');
    setCategoriaId(sortedCategories[0]?.id || '');
    setColecaoId(sortedCollections[0]?.id || '');
    setAtivo(true);
    setEstoque('0');
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setNome(product.nome);
    setPreco(product.preco ? formatCurrencyDisplay(product.preco) : '');
    setPrecoCusto(product.precoCusto ? formatCurrencyDisplay(product.precoCusto) : '');
    setCategoriaId(product.categoriaId || sortedCategories[0]?.id || '');
    setColecaoId(product.colecaoId || sortedCollections[0]?.id || '');
    setAtivo(product.ativo !== false);
    setEstoque(String(product.estoque ?? 0));
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const parsedPreco = parseCurrencyInput(preco);
    const parsedCusto = parseCurrencyInput(precoCusto);

    if (!nome.trim() || parsedPreco <= 0) {
      toast.warning("Informe o nome do produto e um preço de venda válido!");
      return;
    }

    try {
      const payload = {
        nome: nome.trim(),
        preco: parsedPreco,
        precoCusto: parsedCusto,
        categoriaId: categoriaId || "",
        colecaoId: colecaoId || "",
        ativo: ativo,
        estoque: Number(estoque) || 0
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
        toast.success(`Produto "${nome.trim()}" atualizado com sucesso!`);
      } else {
        await addProduct(payload);
        toast.success(`Produto "${nome.trim()}" cadastrado com sucesso!`);
      }

      setIsModalOpen(false);
    } catch (err) {
      toast.error("Erro ao salvar produto: " + err.message);
    }
  };

  const handleDeleteProduct = async (prodId, prodNome) => {
    const confirmed = await confirmDialog({
      title: "Excluir Produto",
      message: `Tem certeza que deseja excluir o produto "${prodNome}"?`,
      confirmText: "Sim, excluir",
      cancelText: "Cancelar",
      danger: true
    });

    if (confirmed) {
      try {
        await deleteProduct(prodId);
        toast.success(`Produto "${prodNome}" excluído.`);
      } catch (err) {
        toast.error("Erro ao excluir produto: " + err.message);
      }
    }
  };

  const handleToggleProductActive = async (product) => {
    const nextStatus = !(product.ativo !== false);
    try {
      await toggleProductActive(product.id, product.ativo !== false);
      toast.info(nextStatus ? `"${product.nome}" ativado.` : `"${product.nome}" inativado (não aparecerá no PDV).`);
    } catch (err) {
      toast.error("Erro ao alterar status do produto: " + err.message);
    }
  };

  // Funções de Estoque
  const handleSaveDirectStock = async (prodId, val) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) {
      toast.warning("Informe um número inteiro válido para o estoque.");
      return;
    }
    try {
      await updateProductStock(prodId, num);
      setEditingStockId(null);
      toast.success("Estoque atualizado com sucesso!");
    } catch (err) {
      toast.error("Erro ao atualizar estoque: " + err.message);
    }
  };

  const handleQuickStockStep = async (product, delta) => {
    const current = product.estoque ?? 0;
    const nextVal = current + delta;
    try {
      await updateProductStock(product.id, nextVal);
    } catch (err) {
      toast.error("Erro ao atualizar estoque: " + err.message);
    }
  };

  // Funções do Modal de Reposição em Lote
  const handleOpenReplenishModal = () => {
    setReplenishMap({});
    setReplenishSearch('');
    setReplenishCategoryFilters([]);
    setReplenishCollectionFilters([]);
    setIsReplenishModalOpen(true);
  };

  const handleReplenishQuantityChange = (productId, val) => {
    const num = parseInt(val, 10);
    setReplenishMap(prev => {
      const copy = { ...prev };
      if (isNaN(num) || num <= 0) {
        delete copy[productId];
      } else {
        copy[productId] = num;
      }
      return copy;
    });
  };

  const handleReplenishStep = (productId, step) => {
    setReplenishMap(prev => {
      const current = prev[productId] || 0;
      const next = current + step;
      const copy = { ...prev };
      if (next <= 0) {
        delete copy[productId];
      } else {
        copy[productId] = next;
      }
      return copy;
    });
  };

  const handleConfirmReplenish = async () => {
    const entries = Object.entries(replenishMap).filter(([_, qty]) => Number(qty) > 0);
    if (entries.length === 0) {
      toast.warning("Informe a quantidade para ao menos um produto.");
      return;
    }

    const batchList = entries.map(([produtoId, quantidade]) => ({
      produtoId,
      quantidade: Number(quantidade)
    }));

    const totalUnidades = entries.reduce((acc, [_, qty]) => acc + Number(qty), 0);

    const confirmed = await confirmDialog({
      title: "Confirmar Reposição em Lote",
      message: `Deseja adicionar +${totalUnidades} unidade(s) distribuídas em ${entries.length} produto(s)?`,
      confirmText: `Confirmar (+${totalUnidades} un)`,
      cancelText: "Cancelar",
      danger: false
    });

    if (!confirmed) {
      return;
    }

    try {
      setIsReplenishing(true);
      await replenishStockBatch(batchList);
      setIsReplenishModalOpen(false);
      setReplenishMap({});
      toast.success(`Reposição de +${totalUnidades} unidades concluída com sucesso!`);
    } catch (err) {
      toast.error("Erro ao realizar reposição em lote: " + err.message);
    } finally {
      setIsReplenishing(false);
    }
  };

  // Funções de Categoria
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatInput.trim()) return;
    try {
      await addCategory(newCatInput.trim());
      toast.success(`Categoria "${newCatInput.trim()}" criada!`);
      setNewCatInput('');
    } catch (err) {
      toast.error("Erro ao adicionar categoria: " + err.message);
    }
  };

  const handleSaveCatEdit = async (catId) => {
    if (!editingCatName.trim()) return;
    try {
      await updateCategory(catId, editingCatName.trim());
      toast.success("Categoria atualizada!");
      setEditingCatId(null);
    } catch (err) {
      toast.error("Erro ao renomear categoria: " + err.message);
    }
  };

  const handleDeleteCategory = async (catId, catNome) => {
    const productsInCat = products.filter(p => p.categoriaId === catId);
    let msg = `Tem certeza que deseja excluir a categoria "${catNome}"?`;
    if (productsInCat.length > 0) {
      msg = `ATENÇÃO: Existem ${productsInCat.length} produto(s) vinculados a "${catNome}". Deseja realmente excluir a categoria?`;
    }

    const confirmed = await confirmDialog({
      title: "Excluir Categoria",
      message: msg,
      confirmText: "Sim, excluir",
      cancelText: "Cancelar",
      danger: true
    });

    if (confirmed) {
      try {
        await deleteCategory(catId);
        toast.success(`Categoria "${catNome}" excluída.`);
      } catch (err) {
        toast.error("Erro ao excluir categoria: " + err.message);
      }
    }
  };

  // Funções de Coleção
  const handleAddCollection = async (e) => {
    e.preventDefault();
    if (!newColInput.trim()) return;
    try {
      await addCollectionDoc(newColInput.trim());
      toast.success(`Coleção "${newColInput.trim()}" criada!`);
      setNewColInput('');
    } catch (err) {
      toast.error("Erro ao adicionar coleção: " + err.message);
    }
  };

  const handleSaveColEdit = async (colId) => {
    if (!editingColName.trim()) return;
    try {
      await updateCollectionDoc(colId, editingColName.trim());
      toast.success("Coleção atualizada!");
      setEditingColId(null);
    } catch (err) {
      toast.error("Erro ao renomear coleção: " + err.message);
    }
  };

  const handleDeleteCollection = async (colId, colNome) => {
    const productsInCol = products.filter(p => p.colecaoId === colId);
    let msg = `Tem certeza que deseja excluir a coleção "${colNome}"?`;
    if (productsInCol.length > 0) {
      msg = `ATENÇÃO: Existem ${productsInCol.length} produto(s) vinculados a "${colNome}". Deseja realmente excluir a coleção?`;
    }

    const confirmed = await confirmDialog({
      title: "Excluir Coleção",
      message: msg,
      confirmText: "Sim, excluir",
      cancelText: "Cancelar",
      danger: true
    });

    if (confirmed) {
      try {
        await deleteCollectionDoc(colId);
        toast.success(`Coleção "${colNome}" excluída.`);
      } catch (err) {
        toast.error("Erro ao excluir coleção: " + err.message);
      }
    }
  };

  const stockFilteredProducts = useMemo(() => {
    const term = stockSearch.trim().toLowerCase();

    const selectedStatus = stockFilters.filter(f => f === 'ativos' || f === 'inativos');
    const selectedLevels = stockFilters.filter(f => f === 'com_estoque' || f === 'zerados' || f === 'negativos');

    return sortedProducts.filter((p) => {
      // 1. Busca textual por nome
      const matchSearch = !term || (p.nome || '').toLowerCase().includes(term);
      if (!matchSearch) return false;

      // 2. Filtro de Categoria (múltipla seleção)
      let matchCat = true;
      if (stockCategoryFilters.length > 0) {
        matchCat = stockCategoryFilters.some(cf => cf === '__sem_categoria__' ? !p.categoriaId : p.categoriaId === cf);
      }
      if (!matchCat) return false;

      // 3. Filtro de Coleção (múltipla seleção)
      let matchCol = true;
      if (stockCollectionFilters.length > 0) {
        matchCol = stockCollectionFilters.some(cf => cf === '__sem_colecao__' ? !p.colecaoId : p.colecaoId === cf);
      }
      if (!matchCol) return false;

      // 4. Filtro de Status (Ativos / Inativos) - combinável
      let matchStatus = true;
      if (selectedStatus.length === 1) {
        if (selectedStatus[0] === 'ativos') matchStatus = p.ativo !== false;
        if (selectedStatus[0] === 'inativos') matchStatus = p.ativo === false;
      }

      // 5. Filtro de Nível de Estoque (Com estoque / Zerados / Negativos) - combinável
      let matchLevel = true;
      if (selectedLevels.length > 0 && selectedLevels.length < 3) {
        const est = p.estoque || 0;
        matchLevel = selectedLevels.some(lvl => {
          if (lvl === 'com_estoque') return est > 0;
          if (lvl === 'zerados') return est === 0;
          if (lvl === 'negativos') return est < 0;
          return false;
        });
      }

      return matchStatus && matchLevel;
    });
  }, [sortedProducts, stockSearch, stockFilters, stockCategoryFilters, stockCollectionFilters]);

  const stockGrouped = useMemo(() => {
    return groupProducts(stockFilteredProducts, sortedCategories, sortedCollections, stockGroupBy);
  }, [stockFilteredProducts, sortedCategories, sortedCollections, stockGroupBy]);

  const replenishFilteredProducts = useMemo(() => {
    const term = replenishSearch.trim().toLowerCase();
    return sortedProducts.filter((p) => {
      const matchName = !term || (p.nome || '').toLowerCase().includes(term);

      let matchCat = true;
      if (replenishCategoryFilters.length > 0) {
        matchCat = replenishCategoryFilters.some(cf => cf === '__sem_categoria__' ? !p.categoriaId : p.categoriaId === cf);
      }

      let matchCol = true;
      if (replenishCollectionFilters.length > 0) {
        matchCol = replenishCollectionFilters.some(cf => cf === '__sem_colecao__' ? !p.colecaoId : p.colecaoId === cf);
      }

      return matchName && matchCat && matchCol;
    });
  }, [sortedProducts, replenishSearch, replenishCategoryFilters, replenishCollectionFilters]);

  const replenishGrouped = useMemo(() => {
    return groupProducts(replenishFilteredProducts, sortedCategories, sortedCollections, replenishGroupBy);
  }, [replenishFilteredProducts, sortedCategories, sortedCollections, replenishGroupBy]);

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
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Catálogo & Categorias
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
            Gerencie preços, custos, produtos, categorias e coleções da Crodiloja
          </p>
        </div>

        {/* Abas Superiores */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            background: 'var(--bg-surface-elevated)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-strong)',
            gap: '4px',
            flexWrap: 'wrap'
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
              onClick={() => setActiveSection('estoque')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: 600,
                background: activeSection === 'estoque' ? 'var(--primary)' : 'transparent',
                color: activeSection === 'estoque' ? '#fff' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Box size={14} /> Estoque
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
            <button
              onClick={() => setActiveSection('colecoes')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: 600,
                background: activeSection === 'colecoes' ? 'var(--primary)' : 'transparent',
                color: activeSection === 'colecoes' ? '#fff' : 'var(--text-secondary)'
              }}
            >
              Coleções ({collections.length})
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

          {activeSection === 'estoque' && (
            <button
              onClick={handleOpenReplenishModal}
              style={{
                background: 'linear-gradient(135deg, var(--primary), #6366f1)',
                color: '#fff',
                padding: '10px 16px',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 10px rgba(56, 189, 248, 0.25)'
              }}
            >
              <TrendingUp size={16} /> + Reposição de Estoque
            </button>
          )}
        </div>
      </div>

      {/* SEÇÃO 1: LISTA DE PRODUTOS */}
      {(() => {
        const renderProductCard = (p) => {
          const categoryName = sortedCategories.find(c => c.id === p.categoriaId)?.nome || 'Sem Categoria';
          const collectionName = sortedCollections.find(c => c.id === p.colecaoId)?.nome;
          const isInactive = p.ativo === false;
          const isNegative = (p.estoque || 0) < 0;
          const margemLucro = p.preco > 0 && p.precoCusto > 0
            ? (((p.preco - p.precoCusto) / p.preco) * 100).toFixed(0)
            : null;

          return (
            <div
              key={p.id}
              style={{
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: isNegative 
                  ? '1px solid rgba(239, 68, 68, 0.4)' 
                  : isInactive 
                    ? '1px dashed var(--border-strong)' 
                    : '1px solid var(--border-subtle)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
                opacity: isInactive ? 0.8 : 1,
                transition: 'opacity 0.2s ease, border-color 0.2s ease'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span className="badge badge-primary">{categoryName}</span>
                    {collectionName && (
                      <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.18)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)', gap: '4px' }}>
                        <Layers size={11} /> {collectionName}
                      </span>
                    )}
                    {isInactive ? (
                      <span style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: 'var(--danger)',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
                        Inativo
                      </span>
                    ) : (
                      <span style={{
                        background: 'rgba(34, 197, 94, 0.15)',
                        color: '#22c55e',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
                        Ativo
                      </span>
                    )}
                  </div>
                  {margemLucro && (
                    <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 700 }}>
                      Lucro: {margemLucro}%
                    </span>
                  )}
                </div>

                <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', lineHeight: '1.3' }}>
                  {p.nome}
                </div>

                {/* Badge de Estoque no Card de Produtos */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '8px',
                  fontSize: '12px'
                }}>
                  <span style={{ color: 'var(--text-muted)' }}>Estoque:</span>
                  <span style={{
                    fontWeight: 800,
                    color: isNegative ? 'var(--danger)' : (p.estoque || 0) === 0 ? '#f59e0b' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {isNegative && <AlertTriangle size={13} style={{ color: 'var(--danger)' }} />}
                    {p.estoque ?? 0} un
                  </span>
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Botão Liga/Desliga Ativar/Inativar */}
                  <button
                    type="button"
                    onClick={() => handleToggleProductActive(p)}
                    title={isInactive ? "Ativar produto" : "Inativar produto"}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: 'transparent',
                      border: 'none',
                      padding: '2px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{
                      width: '38px',
                      height: '22px',
                      borderRadius: '12px',
                      background: isInactive ? 'var(--border-strong)' : '#22c55e',
                      position: 'relative',
                      transition: 'background 0.2s ease',
                      boxShadow: isInactive ? 'none' : '0 2px 6px rgba(34, 197, 94, 0.35)'
                    }}>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: '#fff',
                        position: 'absolute',
                        top: '3px',
                        left: isInactive ? '3px' : '19px',
                        transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                      }} />
                    </div>
                  </button>

                  <button
                    onClick={() => openEditModal(p)}
                    style={{
                      background: 'var(--bg-surface-hover)',
                      color: 'var(--text-primary)',
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
        };

        if (activeSection !== 'produtos') return null;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Barra de Pesquisa e Filtros de Produtos */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: 'var(--bg-surface)',
              padding: '14px 16px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)'
            }}>
              {/* Linha 1: Campo de Busca e Contador */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  position: 'relative',
                  flex: '1 1 280px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    placeholder="Pesquisar por nome do produto..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    style={{
                      width: '100%',
                      paddingLeft: '38px',
                      paddingRight: productSearch ? '36px' : '14px',
                      height: '40px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-strong)',
                      color: 'var(--text-primary)',
                      fontSize: '13px'
                    }}
                  />
                  {productSearch && (
                    <button
                      type="button"
                      onClick={() => setProductSearch('')}
                      title="Limpar busca"
                      style={{
                        position: 'absolute',
                        right: '8px',
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        border: 'none',
                        padding: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Mostrando <strong>{productFilteredList.length}</strong> de {products.length} produtos
                  </span>
                  {(productSearch || productCategoryFilters.length > 0 || productCollectionFilters.length > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setProductSearch('');
                        setProductCategoryFilters([]);
                        setProductCollectionFilters([]);
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
              </div>

              {/* Linha 2: Filtros de Categoria, Coleção e Agrupamento */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                flexWrap: 'wrap',
                paddingTop: '8px',
                borderTop: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
                  {/* Filtro por Categoria (múltipla seleção) */}
                  <MultiSelectDropdown
                    icon={Tag}
                    iconColor="var(--primary)"
                    placeholder="Todas as categorias"
                    allLabel="Todas as categorias"
                    itemLabelSingular="categoria"
                    itemLabelPlural="categorias"
                    options={categorySelectOptions}
                    selectedValues={productCategoryFilters}
                    onChange={setProductCategoryFilters}
                    accentColor="var(--primary)"
                  />

                  {/* Filtro por Coleção (múltipla seleção) */}
                  <MultiSelectDropdown
                    icon={Layers}
                    iconColor="#a855f7"
                    placeholder="Todas as coleções"
                    allLabel="Todas as coleções"
                    itemLabelSingular="coleção"
                    itemLabelPlural="coleções"
                    options={collectionSelectOptions}
                    selectedValues={productCollectionFilters}
                    onChange={setProductCollectionFilters}
                    accentColor="#a855f7"
                  />
                </div>

                {/* Seletor de Subdivisão (Categoria > Coleção ou Coleção > Categoria) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Organizar:
                  </span>
                  <div style={{
                    display: 'flex',
                    background: 'var(--bg-surface-elevated)',
                    padding: '3px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-strong)'
                  }}>
                    <button
                      type="button"
                      onClick={() => setProductGroupBy('categoria')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: productGroupBy === 'categoria' ? 'var(--primary)' : 'transparent',
                        color: productGroupBy === 'categoria' ? '#fff' : 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        border: 'none'
                      }}
                    >
                      <Tag size={13} /> Por Categoria
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductGroupBy('colecao')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: productGroupBy === 'colecao' ? '#a855f7' : 'transparent',
                        color: productGroupBy === 'colecao' ? '#fff' : 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        border: 'none'
                      }}
                    >
                      <Layers size={13} /> Por Coleção
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Conteúdo Subdividido */}
            {sortedProducts.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)'
              }}>
                <Package size={48} strokeWidth={1.2} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Nenhum produto cadastrado</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                  Clique no botão "Novo Produto" acima para cadastrar seu primeiro item.
                </p>
              </div>
            ) : productFilteredList.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '50px 20px',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)'
              }}>
                <Search size={40} strokeWidth={1.5} style={{ color: 'var(--text-muted)', marginBottom: '10px' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Nenhum produto encontrado com os filtros selecionados
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                  Tente buscar por outro termo ou limpe os filtros.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setProductSearch('');
                    setProductCategoryFilters([]);
                    setProductCollectionFilters([]);
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
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {productGrouped.map((group) => (
                  <div
                    key={group.id}
                    style={{
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-subtle)',
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}
                  >
                    {/* Cabeçalho do Grupo Principal (ex: Categoria) */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid var(--border-subtle)',
                      paddingBottom: '12px',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: 'var(--radius-md)',
                          background: productGroupBy === 'categoria' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                          color: productGroupBy === 'categoria' ? 'var(--primary)' : '#a855f7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {productGroupBy === 'categoria' ? <Tag size={18} /> : <Layers size={18} />}
                        </div>
                        <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                          {group.nome}
                        </h2>
                      </div>
                      <span className="badge badge-primary" style={{ fontSize: '12px', fontWeight: 700 }}>
                        {group.totalCount} {group.totalCount === 1 ? 'produto' : 'produtos'}
                      </span>
                    </div>

                    {/* Subgrupos (ex: Coleções dentro da Categoria) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                      {group.subgroups.map((subgroup) => (
                        <div key={subgroup.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {/* Cabeçalho do Subgrupo */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 12px',
                            background: 'var(--bg-surface-elevated)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-strong)',
                            width: 'fit-content'
                          }}>
                            {productGroupBy === 'categoria' ? (
                              <Layers size={14} style={{ color: '#a855f7' }} />
                            ) : (
                              <Tag size={14} style={{ color: 'var(--primary)' }} />
                            )}
                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {subgroup.nome}
                            </span>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: 'var(--text-secondary)',
                              background: 'var(--bg-surface)',
                              padding: '1px 6px',
                              borderRadius: 'var(--radius-full)'
                            }}>
                              {subgroup.products.length}
                            </span>
                          </div>

                          {/* Grade de Produtos deste Subgrupo */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '12px'
                          }}>
                            {subgroup.products.map(renderProductCard)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* SEÇÃO: GERENCIAMENTO DE ESTOQUE */}
      {activeSection === 'estoque' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Resumo de Estoque (KPIs - Apenas itens ativos) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            {/* Total de Unidades (Apenas itens ativos) */}
            <div style={{
              background: 'var(--bg-surface)',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(56, 189, 248, 0.15)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Box size={22} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL EM ESTOQUE</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {products.filter(p => p.ativo !== false).reduce((acc, p) => acc + (p.estoque || 0), 0)}{' '}
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>unidades</span>
                </div>
              </div>
            </div>

            {/* Estoque Negativo (Apenas itens ativos) */}
            {(() => {
              const negativeCount = products.filter(p => p.ativo !== false && (p.estoque || 0) < 0).length;
              return (
                <div style={{
                  background: negativeCount > 0 ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-surface)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: negativeCount > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px'
                }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: 'var(--radius-md)',
                    background: negativeCount > 0 ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-surface-elevated)',
                    color: negativeCount > 0 ? 'var(--danger)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: negativeCount > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 700 }}>
                      ESTOQUE NEGATIVO
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: negativeCount > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {negativeCount}{' '}
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        {negativeCount === 1 ? 'produto' : 'produtos'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Estoque Zerado (Apenas itens ativos) */}
            {(() => {
              const zeroCount = products.filter(p => p.ativo !== false && (p.estoque || 0) === 0).length;
              return (
                <div style={{
                  background: 'var(--bg-surface)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px'
                }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <AlertCircle size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>PRODUTOS ZERADOS</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {zeroCount}{' '}
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        {zeroCount === 1 ? 'item' : 'itens'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Ação de Reposição */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(99, 102, 241, 0.15))',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Repor mercadorias
                </div>
              </div>
              <button
                onClick={handleOpenReplenishModal}
                style={{
                  background: 'var(--primary)',
                  color: '#fff',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                <TrendingUp size={15} /> Repor
              </button>
            </div>
          </div>

          {/* Barra de Busca e Filtros de Estoque */}
          {(() => {
            const handleToggleStockFilter = (id) => {
              if (id === 'all') {
                setStockFilters([]);
                return;
              }
              setStockFilters((prev) => {
                if (prev.includes(id)) {
                  return prev.filter(f => f !== id);
                } else {
                  return [...prev, id];
                }
              });
            };

            const isAllFiltersEmpty = stockFilters.length === 0;

            const stockFilterButtons = [
              { id: 'all', label: 'Todos', isSelected: isAllFiltersEmpty },
              { 
                id: 'ativos', 
                label: 'Ativos', 
                isSelected: stockFilters.includes('ativos'),
                badge: products.filter(p => p.ativo !== false).length, 
                badgeColor: '#22c55e' 
              },
              { 
                id: 'inativos', 
                label: 'Inativos', 
                isSelected: stockFilters.includes('inativos'),
                badge: products.filter(p => p.ativo === false).length, 
                badgeColor: 'var(--danger)' 
              },
              { 
                id: 'com_estoque', 
                label: 'Com estoque', 
                isSelected: stockFilters.includes('com_estoque'),
                badge: products.filter(p => (p.estoque || 0) > 0).length, 
                badgeColor: 'var(--primary)' 
              },
              { 
                id: 'zerados', 
                label: 'Zerados', 
                isSelected: stockFilters.includes('zerados'),
                badge: products.filter(p => p.ativo !== false && (p.estoque || 0) === 0).length, 
                badgeColor: '#f59e0b' 
              },
              { 
                id: 'negativos', 
                label: 'Negativos', 
                isSelected: stockFilters.includes('negativos'),
                badge: products.filter(p => p.ativo !== false && (p.estoque || 0) < 0).length, 
                badgeColor: 'var(--danger)' 
              }
            ];

            const renderStockProductRow = (p) => {
              const isNegative = (p.estoque || 0) < 0;
              const isZero = (p.estoque || 0) === 0;
              const categoryName = sortedCategories.find(c => c.id === p.categoriaId)?.nome || 'Sem Categoria';
              const collectionName = sortedCollections.find(c => c.id === p.colecaoId)?.nome;
              const isEditingThis = editingStockId === p.id;

              return (
                <div
                  key={p.id}
                  style={{
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    border: isNegative 
                      ? '1px solid rgba(239, 68, 68, 0.4)' 
                      : '1px solid var(--border-subtle)',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  {/* Identificação do Produto */}
                  <div style={{ flex: '1 1 240px', minWidth: '220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span className="badge badge-primary">{categoryName}</span>
                      {collectionName && (
                        <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.18)', color: '#818cf8', gap: '4px' }}>
                          <Layers size={11} /> {collectionName}
                        </span>
                      )}
                      {p.ativo === false ? (
                        <span style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: 'var(--danger)',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          Inativo
                        </span>
                      ) : (
                        <span style={{
                          background: 'rgba(34, 197, 94, 0.15)',
                          color: '#22c55e',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          Ativo
                        </span>
                      )}
                    </div>

                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                      {p.nome}
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Preço: R$ {p.preco.toFixed(2).replace('.', ',')}
                      {p.precoCusto > 0 && ` • Custo: R$ ${p.precoCusto.toFixed(2).replace('.', ',')}`}
                    </div>
                  </div>

                  {/* Destaque do Estoque Atual e Ações */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      minWidth: '105px'
                    }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>ESTOQUE ATUAL</span>
                      <div style={{
                        fontSize: '20px',
                        fontWeight: 800,
                        color: isNegative ? 'var(--danger)' : isZero ? '#f59e0b' : 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        {isNegative && <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />}
                        <span>{p.estoque ?? 0}</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>un</span>
                      </div>
                    </div>

                    {/* Ajuste Direto / Rápido */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'var(--bg-surface-elevated)',
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-strong)'
                    }}>
                      {isEditingThis ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="number"
                            step="1"
                            autoFocus
                            value={editingStockVal}
                            onChange={(e) => setEditingStockVal(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveDirectStock(p.id, editingStockVal);
                              if (e.key === 'Escape') setEditingStockId(null);
                            }}
                            style={{
                              width: '70px',
                              padding: '4px 6px',
                              textAlign: 'center',
                              fontWeight: 700,
                              fontSize: '14px'
                            }}
                          />
                          <button
                            onClick={() => handleSaveDirectStock(p.id, editingStockVal)}
                            style={{
                              background: 'var(--primary)',
                              color: '#fff',
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-sm)'
                            }}
                            title="Salvar quantidade"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => setEditingStockId(null)}
                            style={{
                              background: 'transparent',
                              color: 'var(--text-muted)',
                              padding: '6px'
                            }}
                            title="Cancelar"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Botão Diminuir -1 */}
                          <button
                            onClick={() => handleQuickStockStep(p, -1)}
                            style={{
                              background: 'var(--bg-surface)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border-subtle)',
                              width: '30px',
                              height: '30px',
                              borderRadius: 'var(--radius-sm)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Diminuir 1 unidade"
                          >
                            <Minus size={14} />
                          </button>

                          {/* Botão Aumentar +1 */}
                          <button
                            onClick={() => handleQuickStockStep(p, 1)}
                            style={{
                              background: 'var(--bg-surface)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border-subtle)',
                              width: '30px',
                              height: '30px',
                              borderRadius: 'var(--radius-sm)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Aumentar 1 unidade"
                          >
                            <Plus size={14} />
                          </button>

                          {/* Botão Definir como X */}
                          <button
                            onClick={() => {
                              setEditingStockId(p.id);
                              setEditingStockVal(String(p.estoque ?? 0));
                            }}
                            style={{
                              background: 'var(--bg-surface)',
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border-subtle)',
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '12px',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Definir quantidade exata (X)"
                          >
                            <Edit3 size={12} /> Definir X
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            };

            const hasActiveFilters = stockSearch || stockFilters.length > 0 || stockCategoryFilters.length > 0 || stockCollectionFilters.length > 0;

            return (
              <>
                {/* Barra de Busca e Filtros de Estoque */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  background: 'var(--bg-surface)',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  {/* Linha 1: Campo de Busca e Filtros Rápidos Combináveis */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}>
                    {/* Campo de Busca */}
                    <div style={{
                      position: 'relative',
                      flex: '1 1 240px',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }} />
                      <input
                        type="text"
                        placeholder="Buscar produto no estoque..."
                        value={stockSearch}
                        onChange={(e) => setStockSearch(e.target.value)}
                        style={{
                          width: '100%',
                          paddingLeft: '38px',
                          paddingRight: stockSearch ? '36px' : '14px',
                          height: '40px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--bg-surface-elevated)',
                          border: '1px solid var(--border-strong)',
                          color: 'var(--text-primary)',
                          fontSize: '13px'
                        }}
                      />
                      {stockSearch && (
                        <button
                          type="button"
                          onClick={() => setStockSearch('')}
                          title="Limpar busca"
                          style={{
                            position: 'absolute',
                            right: '8px',
                            background: 'transparent',
                            color: 'var(--text-muted)',
                            border: 'none',
                            padding: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>

                    {/* Filtros rápidos combináveis ("somáveis") */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {stockFilterButtons.map((f) => {
                        const isSelected = f.isSelected;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => handleToggleStockFilter(f.id)}
                            style={{
                              padding: '7px 12px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '12px',
                              fontWeight: 600,
                              background: isSelected ? 'var(--primary)' : 'var(--bg-surface-elevated)',
                              color: isSelected ? '#fff' : 'var(--text-secondary)',
                              border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-strong)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span>{f.label}</span>
                            {f.badge !== undefined && (
                              <span style={{
                                background: isSelected ? '#fff' : (f.badgeColor || 'var(--border-strong)'),
                                color: isSelected ? (f.badgeColor || 'var(--primary)') : '#fff',
                                borderRadius: 'var(--radius-full)',
                                padding: '1px 6px',
                                fontSize: '10px',
                                fontWeight: 800
                              }}>
                                {f.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Linha 2: Filtros de Categoria, Coleção, Agrupamento e Contador */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    flexWrap: 'wrap',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--border-subtle)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
                      {/* Filtro por Categoria (múltipla seleção) */}
                      <MultiSelectDropdown
                        icon={Tag}
                        iconColor="var(--primary)"
                        placeholder="Todas as categorias"
                        allLabel="Todas as categorias"
                        itemLabelSingular="categoria"
                        itemLabelPlural="categorias"
                        options={categorySelectOptions}
                        selectedValues={stockCategoryFilters}
                        onChange={setStockCategoryFilters}
                        accentColor="var(--primary)"
                      />

                      {/* Filtro por Coleção (múltipla seleção) */}
                      <MultiSelectDropdown
                        icon={Layers}
                        iconColor="#a855f7"
                        placeholder="Todas as coleções"
                        allLabel="Todas as coleções"
                        itemLabelSingular="coleção"
                        itemLabelPlural="coleções"
                        options={collectionSelectOptions}
                        selectedValues={stockCollectionFilters}
                        onChange={setStockCollectionFilters}
                        accentColor="#a855f7"
                      />

                      {/* Contador e Botão Limpar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          Mostrando <strong>{stockFilteredProducts.length}</strong> de {products.length} produtos
                        </span>
                        {hasActiveFilters && (
                          <button
                            type="button"
                            onClick={() => {
                              setStockSearch('');
                              setStockFilters([]);
                              setStockCategoryFilters([]);
                              setStockCollectionFilters([]);
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
                    </div>

                    {/* Seletor de Agrupamento / Organização */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Organizar:
                      </span>
                      <div style={{
                        display: 'flex',
                        background: 'var(--bg-surface-elevated)',
                        padding: '3px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-strong)'
                      }}>
                        <button
                          type="button"
                          onClick={() => setStockGroupBy('categoria')}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: stockGroupBy === 'categoria' ? 'var(--primary)' : 'transparent',
                            color: stockGroupBy === 'categoria' ? '#fff' : 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            border: 'none'
                          }}
                        >
                          <Tag size={13} /> Por Categoria
                        </button>
                        <button
                          type="button"
                          onClick={() => setStockGroupBy('colecao')}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: stockGroupBy === 'colecao' ? '#a855f7' : 'transparent',
                            color: stockGroupBy === 'colecao' ? '#fff' : 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            border: 'none'
                          }}
                        >
                          <Layers size={13} /> Por Coleção
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conteúdo Subdividido de Estoque (Igual a Produtos) */}
                {sortedProducts.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <Box size={48} strokeWidth={1.2} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Nenhum produto cadastrado</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                      Cadastre seus produtos na aba Produtos para gerenciar o estoque.
                    </p>
                  </div>
                ) : stockFilteredProducts.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '50px 20px',
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <Search size={40} strokeWidth={1.5} style={{ color: 'var(--text-muted)', marginBottom: '10px' }} />
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Nenhum produto encontrado com os filtros selecionados
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                      Tente buscar por outro termo ou limpe os filtros clicáveis.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setStockSearch('');
                        setStockFilters([]);
                        setStockCategoryFilter('');
                        setStockCollectionFilter('');
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
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {stockGrouped.map((group) => (
                      <div
                        key={group.id}
                        style={{
                          background: 'var(--bg-surface)',
                          borderRadius: 'var(--radius-lg)',
                          border: '1px solid var(--border-subtle)',
                          padding: '18px 20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px'
                        }}
                      >
                        {/* Cabeçalho do Grupo Principal (ex: Categoria ou Coleção) */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: '1px solid var(--border-subtle)',
                          paddingBottom: '12px',
                          flexWrap: 'wrap',
                          gap: '8px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: 'var(--radius-md)',
                              background: stockGroupBy === 'categoria' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                              color: stockGroupBy === 'categoria' ? 'var(--primary)' : '#a855f7',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {stockGroupBy === 'categoria' ? <Tag size={18} /> : <Layers size={18} />}
                            </div>
                            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                              {group.nome}
                            </h2>
                          </div>
                          <span className="badge badge-primary" style={{ fontSize: '12px', fontWeight: 700 }}>
                            {group.totalCount} {group.totalCount === 1 ? 'produto' : 'produtos'}
                          </span>
                        </div>

                        {/* Subgrupos */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                          {group.subgroups.map((subgroup) => (
                            <div key={subgroup.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {/* Cabeçalho do Subgrupo */}
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 12px',
                                background: 'var(--bg-surface-elevated)',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-strong)',
                                width: 'fit-content'
                              }}>
                                {stockGroupBy === 'categoria' ? (
                                  <Layers size={14} style={{ color: '#a855f7' }} />
                                ) : (
                                  <Tag size={14} style={{ color: 'var(--primary)' }} />
                                )}
                                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {subgroup.nome}
                                </span>
                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: 'var(--text-secondary)',
                                  background: 'var(--bg-surface)',
                                  padding: '1px 6px',
                                  borderRadius: 'var(--radius-full)'
                                }}>
                                  {subgroup.products.length}
                                </span>
                              </div>

                              {/* Lista de Linhas de Estoque deste Subgrupo */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {subgroup.products.map(renderStockProductRow)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
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

          {/* Barra de Pesquisa de Categorias Existentes */}
          {categories.length > 0 && (
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Pesquisar categoria existente..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: '36px',
                  paddingRight: categorySearch ? '36px' : '12px',
                  height: '38px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '13px'
                }}
              />
              {categorySearch && (
                <button
                  type="button"
                  onClick={() => setCategorySearch('')}
                  title="Limpar busca"
                  style={{
                    position: 'absolute',
                    right: '8px',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </div>
          )}

          {/* Lista de Categorias */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {categories.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)'
              }}>
                <Tag size={36} strokeWidth={1.2} style={{ marginBottom: '8px', opacity: 0.6 }} />
                <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Nenhuma categoria cadastrada</p>
                <p style={{ fontSize: '13px', marginTop: '4px' }}>Digite um nome acima para criar a primeira categoria.</p>
              </div>
            ) : filteredCategoriesList.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '30px 20px',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                fontSize: '13px'
              }}>
                Nenhuma categoria encontrada para "{categorySearch}".
              </div>
            ) : (
              filteredCategoriesList.map((cat) => {
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
                        <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
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
                            color: 'var(--text-primary)',
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
            }))}
          </div>
        </div>
      )}

      {/* SEÇÃO 3: GERENCIAMENTO DE COLEÇÕES */}
      {activeSection === 'colecoes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
          {/* Adicionar Nova Coleção */}
          <form onSubmit={handleAddCollection} style={{
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
              placeholder="Nome da nova coleção (ex: Capivaras, Coleção 2026...)"
              value={newColInput}
              onChange={(e) => setNewColInput(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              style={{
                background: 'var(--accent)',
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

          {/* Barra de Pesquisa de Coleções Existentes */}
          {collections.length > 0 && (
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Pesquisar coleção existente..."
                value={collectionSearch}
                onChange={(e) => setCollectionSearch(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: '36px',
                  paddingRight: collectionSearch ? '36px' : '12px',
                  height: '38px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '13px'
                }}
              />
              {collectionSearch && (
                <button
                  type="button"
                  onClick={() => setCollectionSearch('')}
                  title="Limpar busca"
                  style={{
                    position: 'absolute',
                    right: '8px',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </div>
          )}

          {/* Lista de Coleções */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {collections.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)'
              }}>
                <Layers size={36} strokeWidth={1.2} style={{ marginBottom: '8px', opacity: 0.6 }} />
                <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Nenhuma coleção cadastrada</p>
                <p style={{ fontSize: '13px', marginTop: '4px' }}>Digite um nome acima para criar a primeira coleção.</p>
              </div>
            ) : filteredCollectionsList.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '30px 20px',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                fontSize: '13px'
              }}>
                Nenhuma coleção encontrada para "{collectionSearch}".
              </div>
            ) : (
              filteredCollectionsList.map((col) => {
                const isEditing = editingColId === col.id;
                const count = products.filter(p => p.colecaoId === col.id).length;

                return (
                  <div
                    key={col.id}
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
                          value={editingColName}
                          onChange={(e) => setEditingColName(e.target.value)}
                          autoFocus
                          style={{ flex: 1, padding: '6px 10px' }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveColEdit(col.id)}
                          style={{
                            background: 'var(--accent)',
                            color: '#fff',
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-sm)'
                          }}
                        >
                          <Check size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingColId(null)}
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--accent-light)',
                            color: 'var(--accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Layers size={14} />
                          </span>
                          <div>
                            <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                              {col.nome}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                              ({count} produtos)
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingColId(col.id);
                              setEditingColName(col.nome);
                            }}
                            title="Alterar nome da coleção"
                            style={{
                              background: 'var(--bg-surface-elevated)',
                              color: 'var(--text-primary)',
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-sm)'
                            }}
                          >
                            <Edit3 size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCollection(col.id, col.nome)}
                            title="Excluir coleção"
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
              })
            )}
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
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
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
                  {sortedCategories.map((c) => (
                    <option key={c.id} value={c.id} style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Coleção
                </label>
                <select
                  value={colecaoId}
                  onChange={(e) => setColecaoId(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">Selecione uma coleção...</option>
                  {sortedCollections.map((col) => (
                    <option key={col.id} value={col.id} style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                      {col.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Preço de Venda *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="R$ 0,00"
                    value={preco}
                    onChange={(e) => handleCurrencyInputChange(e.target.value, setPreco)}
                    style={{ width: '100%', fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Preço de Custo
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="R$ 0,00"
                    value={precoCusto}
                    onChange={(e) => handleCurrencyInputChange(e.target.value, setPrecoCusto)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Estoque e Status (Liga/Desliga) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Estoque Atual
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="number"
                      step="1"
                      placeholder="0"
                      value={estoque}
                      onChange={(e) => setEstoque(e.target.value)}
                      style={{
                        width: '100%',
                        paddingRight: (estoque !== '' && estoque !== null) ? '38px' : '12px',
                        fontWeight: 700,
                        color: Number(estoque) < 0 ? 'var(--danger)' : 'var(--text-primary)'
                      }}
                    />
                    {(estoque !== '' && estoque !== null) && (
                      <span style={{
                        position: 'absolute',
                        right: '12px',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: Number(estoque) < 0 ? 'var(--danger)' : 'var(--text-muted)',
                        pointerEvents: 'none',
                        userSelect: 'none'
                      }}>
                        un
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setAtivo(!ativo)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '9px 12px',
                      background: 'var(--bg-surface-elevated)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-strong)',
                      width: '100%',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 700, color: ativo ? '#22c55e' : 'var(--danger)' }}>
                      {ativo ? 'Ativo' : 'Inativo'}
                    </span>
                    {/* Switch track */}
                    <div style={{
                      width: '38px',
                      height: '22px',
                      borderRadius: '12px',
                      background: ativo ? '#22c55e' : 'var(--border-strong)',
                      position: 'relative',
                      transition: 'background 0.2s ease',
                      boxShadow: ativo ? '0 2px 6px rgba(34, 197, 94, 0.35)' : 'none'
                    }}>
                      {/* Switch thumb */}
                      <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: '#fff',
                        position: 'absolute',
                        top: '3px',
                        left: ativo ? '19px' : '3px',
                        transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                      }} />
                    </div>
                  </button>
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

      {/* MODAL DE REPOSIÇÃO DE ESTOQUE EM LOTE */}
      {isReplenishModalOpen && (
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
            maxWidth: '650px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }} className="animate-fade-in">
            {/* Cabeçalho do Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={20} style={{ color: 'var(--primary)' }} />
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Reposição de Estoque em Lote
                  </h2>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px', margin: 0 }}>
                  Informe as unidades que chegaram para cada produto.
                </p>
              </div>
              <button 
                onClick={() => setIsReplenishModalOpen(false)} 
                style={{ background: 'transparent', color: 'var(--text-muted)', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Barra de Busca e Filtros para Reposição */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              marginBottom: '14px',
              background: 'var(--bg-surface-elevated)',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-strong)'
            }}>
              {/* Campo de Busca Rápida */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Pesquisar produto para repor..."
                  value={replenishSearch}
                  onChange={(e) => setReplenishSearch(e.target.value)}
                  style={{ width: '100%', paddingLeft: '36px', paddingRight: replenishSearch ? '34px' : '12px', height: '38px', borderRadius: 'var(--radius-sm)' }}
                />
                {replenishSearch && (
                  <button
                    type="button"
                    onClick={() => setReplenishSearch('')}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', padding: '2px' }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Filtros de Categoria, Coleção e Agrupamento */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                  {/* Filtro por Categoria (múltipla seleção) */}
                  <MultiSelectDropdown
                    icon={Tag}
                    iconColor="var(--primary)"
                    placeholder="Todas as categorias"
                    allLabel="Todas as categorias"
                    itemLabelSingular="categoria"
                    itemLabelPlural="categorias"
                    options={categorySelectOptions}
                    selectedValues={replenishCategoryFilters}
                    onChange={setReplenishCategoryFilters}
                    minWidth="160px"
                    accentColor="var(--primary)"
                  />

                  {/* Filtro por Coleção (múltipla seleção) */}
                  <MultiSelectDropdown
                    icon={Layers}
                    iconColor="#a855f7"
                    placeholder="Todas as coleções"
                    allLabel="Todas as coleções"
                    itemLabelSingular="coleção"
                    itemLabelPlural="coleções"
                    options={collectionSelectOptions}
                    selectedValues={replenishCollectionFilters}
                    onChange={setReplenishCollectionFilters}
                    minWidth="160px"
                    accentColor="#a855f7"
                  />
                </div>

                {/* Alternador de Organização */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    display: 'flex',
                    background: 'var(--bg-surface)',
                    padding: '2px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-strong)'
                  }}>
                    <button
                      type="button"
                      onClick={() => setReplenishGroupBy('categoria')}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: replenishGroupBy === 'categoria' ? 'var(--primary)' : 'transparent',
                        color: replenishGroupBy === 'categoria' ? '#fff' : 'var(--text-secondary)',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Por Categoria
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplenishGroupBy('colecao')}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: replenishGroupBy === 'colecao' ? '#a855f7' : 'transparent',
                        color: replenishGroupBy === 'colecao' ? '#fff' : 'var(--text-secondary)',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Por Coleção
                    </button>
                  </div>

                  {(replenishSearch || replenishCategoryFilters.length > 0 || replenishCollectionFilters.length > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setReplenishSearch('');
                        setReplenishCategoryFilters([]);
                        setReplenishCollectionFilters([]);
                      }}
                      style={{
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '3px 6px'
                      }}
                      title="Limpar filtros"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Lista com Rolagem dos Produtos Subdividida por Categoria e Coleção */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              paddingRight: '4px',
              maxHeight: '48vh',
              marginBottom: '16px'
            }}>
              {replenishFilteredProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  Nenhum produto encontrado com os filtros selecionados.
                </div>
              ) : (
                replenishGrouped.map((group) => (
                  <div
                    key={group.id}
                    style={{
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    {/* Cabeçalho do Grupo Principal (ex: Categoria) */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid var(--border-subtle)',
                      paddingBottom: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {replenishGroupBy === 'categoria' ? (
                          <Tag size={16} color="var(--primary)" />
                        ) : (
                          <Layers size={16} color="#a855f7" />
                        )}
                        <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {group.nome}
                        </span>
                      </div>
                      <span className="badge badge-primary" style={{ fontSize: '11px', fontWeight: 700 }}>
                        {group.totalCount} {group.totalCount === 1 ? 'item' : 'itens'}
                      </span>
                    </div>

                    {/* Subgrupos (ex: Coleções dentro da Categoria) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {group.subgroups.map((subgroup) => (
                        <div key={subgroup.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {/* Sub-cabeçalho */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '3px 8px',
                            background: 'var(--bg-surface-elevated)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-strong)',
                            width: 'fit-content',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--text-secondary)'
                          }}>
                            {replenishGroupBy === 'categoria' ? (
                              <Layers size={12} color="#a855f7" />
                            ) : (
                              <Tag size={12} color="var(--primary)" />
                            )}
                            <span>{subgroup.nome}</span>
                            <span style={{ opacity: 0.8 }}>({subgroup.products.length})</span>
                          </div>

                          {/* Linhas de Produtos para Reposição */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {subgroup.products.map((p) => {
                              const qtyToAdd = replenishMap[p.id] ?? '';
                              const currentStock = p.estoque || 0;
                              const newProjectedStock = currentStock + (Number(qtyToAdd) || 0);
                              const isNegative = currentStock < 0;

                              return (
                                <div
                                  key={p.id}
                                  style={{
                                    background: Number(qtyToAdd) > 0 ? 'rgba(56, 189, 248, 0.08)' : 'var(--bg-surface-elevated)',
                                    border: Number(qtyToAdd) > 0 ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '8px 12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: '8px',
                                    transition: 'background 0.15s ease, border-color 0.15s ease'
                                  }}
                                >
                                  {/* Dados do Produto */}
                                  <div style={{ flex: '1 1 180px' }}>
                                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                                      {p.nome}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                      <span>
                                        Atual: <strong style={{ color: isNegative ? 'var(--danger)' : 'var(--text-secondary)' }}>{currentStock} un</strong>
                                      </span>
                                      {Number(qtyToAdd) > 0 && (
                                        <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
                                          ➔ Novo: {newProjectedStock} un (+{qtyToAdd})
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Controles de Reposição */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleReplenishStep(p.id, 1)}
                                      style={{
                                        background: 'var(--bg-surface)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border-strong)',
                                        padding: '3px 7px',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                      }}
                                      title="Adicionar +1"
                                    >
                                      +1
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleReplenishStep(p.id, 5)}
                                      style={{
                                        background: 'var(--bg-surface)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border-strong)',
                                        padding: '3px 7px',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                      }}
                                      title="Adicionar +5"
                                    >
                                      +5
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleReplenishStep(p.id, 10)}
                                      style={{
                                        background: 'var(--bg-surface)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border-strong)',
                                        padding: '3px 7px',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                      }}
                                      title="Adicionar +10"
                                    >
                                      +10
                                    </button>

                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      placeholder="+0"
                                      value={qtyToAdd}
                                      onChange={(e) => handleReplenishQuantityChange(p.id, e.target.value)}
                                      style={{
                                        width: '65px',
                                        padding: '4px 6px',
                                        textAlign: 'center',
                                        fontWeight: 800,
                                        fontSize: '13px',
                                        color: Number(qtyToAdd) > 0 ? 'var(--primary)' : 'var(--text-primary)',
                                        borderRadius: 'var(--radius-sm)'
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Rodapé com Resumo e Ação de Confirmação */}
            {(() => {
              const entries = Object.entries(replenishMap).filter(([_, qty]) => Number(qty) > 0);
              const totalUnidades = entries.reduce((acc, [_, qty]) => acc + Number(qty), 0);
              const totalProdutos = entries.length;

              return (
                <div style={{
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {totalProdutos === 0 ? 'Nenhum produto selecionado' : `${totalProdutos} produto(s) no lote`}
                    </div>
                    <div style={{ fontSize: '12px', color: totalUnidades > 0 ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600 }}>
                      Total a repor: +{totalUnidades} unidades
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {totalProdutos > 0 && (
                      <button
                        type="button"
                        onClick={() => setReplenishMap({})}
                        style={{
                          background: 'var(--bg-surface-elevated)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-strong)',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-md)',
                          fontWeight: 600,
                          fontSize: '13px'
                        }}
                      >
                        Limpar
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={totalProdutos === 0 || isReplenishing}
                      onClick={handleConfirmReplenish}
                      style={{
                        background: totalProdutos === 0 ? 'var(--bg-surface-elevated)' : 'var(--primary)',
                        color: totalProdutos === 0 ? 'var(--text-muted)' : '#fff',
                        padding: '10px 18px',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 700,
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: totalProdutos === 0 || isReplenishing ? 'not-allowed' : 'pointer',
                        opacity: isReplenishing ? 0.7 : 1
                      }}
                    >
                      <Check size={16} />
                      {isReplenishing 
                        ? 'Gravando no Firebase...' 
                        : totalUnidades > 0 
                          ? `Confirmar Reposição (+${totalUnidades} un)` 
                          : 'Confirmar Reposição'}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
