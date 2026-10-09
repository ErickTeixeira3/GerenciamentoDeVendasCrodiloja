import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  query, 
  orderBy 
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

// --- EVENTOS ---
export function subscribeEvents(callback) {
  const colRef = collection(db, "Eventos");
  return onSnapshot(colRef, (snapshot) => {
    const list = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
      nome: docSnap.data().nome || docSnap.data().Nome || "Evento sem nome"
    }));
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
      return {
        id: docSnap.id,
        ...data,
        nome: data.nome || data.Nome || "Produto sem nome",
        preco: Number(data.preco || 0),
        precoCusto: Number(data.precoCusto || 0),
        categoriaId: typeof data.categoria === "object" && data.categoria?.id 
          ? data.categoria.id 
          : (typeof data.categoria === "string" ? data.categoria : "")
      };
    });
    callback(list);
  }, (error) => {
    console.error("Erro ao escutar Produtos:", error);
    callback([]);
  });
}

export async function addProduct(product) {
  // Salva o preço exatamente como número arredondado a 2 casas, sem decimais bizarros
  const precoFinal = Math.round(Number(product.preco) * 100) / 100;
  const precoCustoFinal = Math.round(Number(product.precoCusto || 0) * 100) / 100;

  return await addDoc(collection(db, "Produtos"), {
    nome: product.nome,
    preco: precoFinal,
    precoCusto: precoCustoFinal,
    categoria: product.categoriaId || "",
    fotoUrl: product.fotoUrl || "",
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
    criadoPor: "vendedor",
    atualizadoPor: "vendedor"
  });
}

export async function updateProduct(id, product) {
  const precoFinal = Math.round(Number(product.preco) * 100) / 100;
  const precoCustoFinal = Math.round(Number(product.precoCusto || 0) * 100) / 100;

  const docRef = doc(db, "Produtos", id);
  return await updateDoc(docRef, {
    nome: product.nome,
    preco: precoFinal,
    precoCusto: precoCustoFinal,
    categoria: product.categoriaId || "",
    fotoUrl: product.fotoUrl || "",
    atualizadoEm: serverTimestamp(),
    atualizadoPor: "vendedor"
  });
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
    // Se não tiver índice para orderBy, fallback para coleção normal
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
  return await addDoc(collection(db, "Vendas"), {
    ...saleData,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  });
}

export async function deleteSale(saleId) {
  const docRef = doc(db, "Vendas", saleId);
  return await deleteDoc(docRef);
}
