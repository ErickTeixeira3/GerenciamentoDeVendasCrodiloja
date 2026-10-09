import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PDVView from './components/PDV/PDVView';
import VendasList from './components/Vendas/VendasList';
import ProdutosManager from './components/Produtos/ProdutosManager';
import EventosModal from './components/Eventos/EventosModal';
import LoginScreen from './components/Auth/LoginScreen';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebase';
import { 
  subscribeCategories, 
  subscribeEvents, 
  subscribeProducts, 
  subscribeSales 
} from './services/firestoreService';

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [activeTab, setActiveTab] = useState('pdv'); // 'pdv', 'vendas', 'produtos'
  
  // Dados do Firestore
  const [categories, setCategories] = useState([]);
  const [events, setEvents] = useState([]);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);

  // Evento selecionado
  const [currentEventId, setCurrentEventId] = useState(() => {
    return localStorage.getItem('crodiloja_event_id') || '';
  });

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  // Monitora o estado de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // Escuta em tempo real no Firestore apenas quando o usuário estiver autenticado
  useEffect(() => {
    if (!user) return;

    const unsubCat = subscribeCategories(setCategories);
    const unsubEv = subscribeEvents((list) => {
      setEvents(list);
      if (list.length > 0 && !currentEventId) {
        setCurrentEventId(list[0].id);
      }
    });
    const unsubProd = subscribeProducts(setProducts);
    const unsubSales = subscribeSales(setSales);

    return () => {
      unsubCat();
      unsubEv();
      unsubProd();
      unsubSales();
    };
  }, [user]);

  // Salva o evento ativo no localStorage para não perder ao recarregar no tablet
  useEffect(() => {
    if (currentEventId) {
      localStorage.setItem('crodiloja_event_id', currentEventId);
    }
  }, [currentEventId]);

  // Carregamento inicial da autenticação
  if (loadingAuth) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-main)',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🐊</div>
          <div style={{ fontWeight: 600 }}>Carregando Crodiloja...</div>
        </div>
      </div>
    );
  }

  // Se não estiver logado, exibe a tela de login
  if (!user) {
    return <LoginScreen />;
  }

  const currentEvent = events.find((e) => e.id === currentEventId) || events[0];

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-main)'
    }}>
      {/* Topo / Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        events={events}
        currentEventId={currentEventId}
        setCurrentEventId={setCurrentEventId}
        onOpenNewEventModal={() => setIsEventModalOpen(true)}
        user={user}
      />

      {/* Conteúdo Principal de acordo com a Aba */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'pdv' && (
          <PDVView
            products={products}
            categories={categories}
            currentEvent={currentEvent}
            user={user}
            onGoToProducts={() => setActiveTab('produtos')}
            onGoToEvents={() => setIsEventModalOpen(true)}
          />
        )}

        {activeTab === 'vendas' && (
          <VendasList
            sales={sales}
            events={events}
            currentEventId={currentEventId}
          />
        )}

        {activeTab === 'produtos' && (
          <ProdutosManager
            products={products}
            categories={categories}
          />
        )}
      </main>

      {/* Modal de Gestão de Eventos */}
      <EventosModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        events={events}
        currentEventId={currentEventId}
        setCurrentEventId={setCurrentEventId}
      />
    </div>
  );
}
