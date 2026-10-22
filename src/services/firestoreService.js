import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  query, 
  orderBy,
  writeBatch,
  increment,
  getDoc
} from "firebase/firestore";
import { db } from "./firebase";

// --- CATEGORIAS ---
export function subscribeCategories(callback) {
  const colRef = collection(db, "Categorias");
  return onSnapshot(colRef, (snapshot) => {
    const list = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
      // Normaliza para 'nome' mesmo se no banco tiver 'Nome'
      nome: docSnap.data().nome || docSnap.data().Nome || "Sem Nome"
    }));
    // Ordem alfabética por padrão
    list.sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR", { sensitivity: "base" }));
    callback(list);
  }, (error) => {
    console.error("Erro ao escutar Categorias:", error);
    callback([]);
  });
}

export async function addCategory(nome) {
  return await addDoc(collection(db, "Categorias"), {
    Nome: nome,
    nome: nome,
    criadoEm: serverTimestamp()
  });
}

export async function updateCategory(id, nome) {
  const docRef = doc(db, "Categorias", id);
  return await updateDoc(docRef, {
    Nome: nome,
    nome: nome,
    atualizadoEm: serverTimestamp()
  });
}

export async function deleteCategory(id) {
  const docRef = doc(db, "Categorias", id);
  return await deleteDoc(docRef);
}

// --- COLEÇÕES ---
export function subscribeCollections(callback) {
  const colRef = collection(db, "Colecoes");
  return onSnapshot(colRef, (snapshot) => {
    const list = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
      // Normaliza para 'nome' mesmo se no banco tiver 'Nome'
      nome: docSnap.data().nome || docSnap.data().Nome || "Sem Nome"
    }));
    // Ordem alfabética por padrão
    list.sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR", { sensitivity: "base" }));
    callback(list);
  }, (error) => {
    console.error("Erro ao escutar Coleções:", error);
    callback([]);
  });
}

export async function addCollectionDoc(nome) {
  return await addDoc(collection(db, "Colecoes"), {
    Nome: nome,
    nome: nome,
    criadoEm: serverTimestamp()
  });
}

export async function updateCollectionDoc(id, nome) {
  const docRef = doc(db, "Colecoes", id);
  return await updateDoc(docRef, {
    Nome: nome,
    nome: nome,
    atualizadoEm: serverTimestamp()
  });
}

export async function deleteCollectionDoc(id) {
  const docRef = doc(db, "Colecoes", id);
  return await deleteDoc(docRef);
}

// Aliases em português para conveniência
export const addColecao = addCollectionDoc;
export const updateColecao = updateCollectionDoc;
export const deleteColecao = deleteCollectionDoc;

// --- EVENTOS ---
export function subscribeEvents(callback) {
  const colRef = collection(db, "Eventos");
  return onSnapshot(colRef, (snapshot) => {
    const list = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
      nome: docSnap.data().nome || docSnap.data().Nome || "Evento sem nome"
    }));
    // Ordem alfabética por padrão
    list.sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR", { sensitivity: "base" }));
    callback(list);
  }, (error) => {
    console.error("Erro ao escutar Eventos:", error);
    callback([]);
  });
}

export async function addEvent(nome) {
  return await addDoc(collection(db, "Eventos"), {
    nome: nome,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
    criadoPor: "vendedor",
    atualizadoPor: "vendedor"
  });
}

export async function updateEvent(id, nome) {
  const docRef = doc(db, "Eventos", id);
  return await updateDoc(docRef, {
    nome: nome,
    atualizadoEm: serverTimestamp(),
    atualizadoPor: "vendedor"
  });
}

export async function deleteEvent(id) {
  const docRef = doc(db, "Eventos", id);
  return await deleteDoc(docRef);
}

// --- PRODUTOS ---
export function subscribeProducts(callback) {
  const colRef = collection(db, "Produtos");
  return onSnapshot(colRef, (snapshot) => {
    const list = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const colecaoRef = data.colecao || data.Colecao || data.colecaoRef;
      const colecaoId = typeof colecaoRef === "object" && colecaoRef?.id 
        ? colecaoRef.id 
        : (typeof colecaoRef === "string" ? colecaoRef : "");

      return {
        id: docSnap.id,
        ...data,
        nome: data.nome || data.Nome || "Produto sem nome",
        preco: Number(data.preco || 0),
        precoCusto: Number(data.precoCusto || 0),
        categoriaId: typeof data.categoria === "object" && data.categoria?.id 
          ? data.categoria.id 
          : (typeof data.categoria === "string" ? data.categoria : ""),
        colecaoId: colecaoId,
        ativo: data.ativo !== false, // Padrão é true (ativo)
        estoque: typeof data.estoque === "number" ? data.estoque : (Number(data.estoque) || 0)
      };
    });
    // Ordem alfabética por padrão
    list.sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR", { sensitivity: "base" }));
    callback(list);
  }, (error) => {
    console.error("Erro ao escutar Produtos:", error);
    callback([]);
  });
}

export async function addProduct(product) {
  const precoFinal = Math.round(Number(product.preco) * 100) / 100;
  const precoCustoFinal = Math.round(Number(product.precoCusto || 0) * 100) / 100;

  const payload = {
    nome: product.nome,
    preco: precoFinal,
    precoCusto: precoCustoFinal,
    categoria: product.categoriaId || "",
    fotoUrl: product.fotoUrl || "",
    ativo: (product.ativo === null || product.ativo === undefined || product.ativo === '') ? null : (product.ativo !== false),
    estoque: Number(product.estoque || 0),
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
    criadoPor: "vendedor",
    atualizadoPor: "vendedor"
  };

  // Se houver colecaoId, salva como DocumentReference (tipo Reference no Firebase)
  if (product.colecaoId) {
    payload.colecao = doc(db, "Colecoes", product.colecaoId);
  } else {
    payload.colecao = null;
  }

  return await addDoc(collection(db, "Produtos"), payload);
}

export async function updateProduct(id, product) {
  const precoFinal = Math.round(Number(product.preco) * 100) / 100;
  const precoCustoFinal = Math.round(Number(product.precoCusto || 0) * 100) / 100;

  const docRef = doc(db, "Produtos", id);
  const payload = {
    nome: product.nome,
    preco: precoFinal,
    precoCusto: precoCustoFinal,
    categoria: product.categoriaId || "",
    fotoUrl: product.fotoUrl || "",
    atualizadoEm: serverTimestamp(),
    atualizadoPor: "vendedor"
  };

  if (product.ativo !== undefined) {
    payload.ativo = product.ativo !== false;
  }
  if (product.estoque !== undefined) {
    payload.estoque = Number(product.estoque);
  }

  // Se houver colecaoId, salva como DocumentReference (tipo Reference no Firebase)
  if (product.colecaoId) {
    payload.colecao = doc(db, "Colecoes", product.colecaoId);
  } else {
    payload.colecao = null;
  }

  return await updateDoc(docRef, payload);
}

export async function toggleProductActive(id, currentStatus) {
  const docRef = doc(db, "Produtos", id);
  return await updateDoc(docRef, {
    ativo: !currentStatus,
    atualizadoEm: serverTimestamp()
  });
}

export async function updateProductStock(id, newStock) {
  const docRef = doc(db, "Produtos", id);
  return await updateDoc(docRef, {
    estoque: Number(newStock),
    atualizadoEm: serverTimestamp()
  });
}

export async function replenishStockBatch(replenishments) {
  // replenishments: array de { produtoId, quantidade }
  const batch = writeBatch(db);
  for (const item of replenishments) {
    const qty = Number(item.quantidade);
    if (item.produtoId && !isNaN(qty) && qty !== 0) {
      const prodRef = doc(db, "Produtos", item.produtoId);
      batch.update(prodRef, {
        estoque: increment(qty),
        atualizadoEm: serverTimestamp()
      });
    }
  }
  return await batch.commit();
}

export async function deleteProduct(id) {
  const docRef = doc(db, "Produtos", id);
  return await deleteDoc(docRef);
}

// --- VENDAS ---
export function subscribeSales(callback) {
  const colRef = collection(db, "Vendas");
  const q = query(colRef, orderBy("criadoEm", "desc"));
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    callback(list);
  }, (error) => {
    console.warn("Fallback ao escutar Vendas:", error);
    return onSnapshot(colRef, (snapshot) => {
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      callback(list);
    });
  });
}

export async function createSale(saleData) {
  const batch = writeBatch(db);

  // 1. Cria a venda
  const salesColRef = collection(db, "Vendas");
  const newSaleDocRef = doc(salesColRef);
  batch.set(newSaleDocRef, {
    ...saleData,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  });

  // 2. Abate do estoque de cada item vendido (valores negativos permitidos)
  if (Array.isArray(saleData.itens)) {
    for (const item of saleData.itens) {
      if (item.produtoId) {
        const prodRef = doc(db, "Produtos", item.produtoId);
        const qty = Number(item.quantidade || 1);
        batch.update(prodRef, {
          estoque: increment(-qty),
          atualizadoEm: serverTimestamp()
        });
      }
    }
  }

  await batch.commit();
  return newSaleDocRef;
}

export async function updateSale(saleId, originalSale, updatedSaleData) {
  const batch = writeBatch(db);
  const saleDocRef = doc(db, "Vendas", saleId);

  // Se originalSale não foi passado completo com itens, busca do Firestore
  let orig = originalSale;
  if (!orig || !orig.itens) {
    const saleSnap = await getDoc(saleDocRef);
    if (saleSnap.exists()) {
      orig = saleSnap.data();
    }
  }

  // 1. Atualiza os dados da venda
  batch.update(saleDocRef, {
    ...updatedSaleData,
    atualizadoEm: serverTimestamp()
  });

  // 2. Calcula a diferença de estoque por produto:
  // delta = originalQty - newQty
  // delta > 0: o usuário reduziu quantidade ou removeu o item -> estorna (+delta) para o estoque
  // delta < 0: o usuário aumentou quantidade ou adicionou novo item -> debita (-delta) do estoque
  const productDeltas = new Map();

  (orig?.itens || []).forEach((item) => {
    if (item.produtoId) {
      const current = productDeltas.get(item.produtoId) || 0;
      productDeltas.set(item.produtoId, current + Number(item.quantidade || 0));
    }
  });

  (updatedSaleData?.itens || []).forEach((item) => {
    if (item.produtoId) {
      const current = productDeltas.get(item.produtoId) || 0;
      productDeltas.set(item.produtoId, current - Number(item.quantidade || 0));
    }
  });

  for (const [produtoId, delta] of productDeltas.entries()) {
    if (delta !== 0) {
      const prodRef = doc(db, "Produtos", produtoId);
      const prodSnap = await getDoc(prodRef);
      if (prodSnap.exists()) {
        batch.update(prodRef, {
          estoque: increment(delta),
          atualizadoEm: serverTimestamp()
        });
      }
    }
  }

  return await batch.commit();
}

export async function deleteSale(saleOrId, maybeItens) {
  const saleId = typeof saleOrId === 'object' ? saleOrId.id : saleOrId;
  let itens = typeof saleOrId === 'object' ? saleOrId.itens : maybeItens;

  const saleDocRef = doc(db, "Vendas", saleId);

  if (!itens) {
    const saleSnap = await getDoc(saleDocRef);
    if (saleSnap.exists()) {
      itens = saleSnap.data().itens || [];
    }
  }

  const batch = writeBatch(db);
  batch.delete(saleDocRef);

  // Estorna o estoque de todos os itens da venda cancelada
  if (Array.isArray(itens)) {
    for (const item of itens) {
      if (item.produtoId) {
        const qty = Number(item.quantidade || 0);
        if (qty > 0) {
          const prodRef = doc(db, "Produtos", item.produtoId);
          const prodSnap = await getDoc(prodRef);
          if (prodSnap.exists()) {
            batch.update(prodRef, {
              estoque: increment(qty),
              atualizadoEm: serverTimestamp()
            });
          }
        }
      }
    }
  }

  return await batch.commit();
}

