import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PDVView from './components/PDV/PDVView';
import VendasList from './components/Vendas/VendasList';
import ProdutosManager from './components/Produtos/ProdutosManager';
import EventosModal from './components/Eventos/EventosModal';
import LoginScreen from './components/Auth/LoginScreen';
import ToastContainer from './components/Common/ToastContainer';
import ConfirmModal from './components/Common/ConfirmModal';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebase';
import { 
  subscribeCategories, 
  subscribeCollections,
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
  const [collections, setCollections] = useState([]);
  const [events, setEvents] = useState([]);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);

  // Evento selecionado
  const [currentEventId, setCurrentEventId] = useState(() => {
    return localStorage.getItem('crodiloja_event_id') || '';
  });

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);

  // Tema: Claro por padrão, com opção para Escuro
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('crodiloja_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('crodiloja_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

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
    const unsubCol = subscribeCollections(setCollections);
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
      unsubCol();
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
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-strong)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px',
            marginBottom: '14px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <img 
              src="/logoCrodiloja.svg" 
              alt="Crodiloja" 
              className="crodiloja-logo" 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
            />
          </div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Carregando Crodiloja...</div>
        </div>
      </div>
    );
  }

  // Se não estiver logado, exibe a tela de login
  if (!user) {
    return <LoginScreen theme={theme} toggleTheme={toggleTheme} />;
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIsHeaderHidden(false);
  };

  const currentEvent = events.find((e) => e.id === currentEventId) || events[0];

  return (
    <div style={{
      minHeight: '100dvh',
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-main)',
      overflow: 'hidden'
    }}>
      {/* Topo / Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        events={events}
        currentEventId={currentEventId}
        setCurrentEventId={setCurrentEventId}
        onOpenNewEventModal={() => setIsEventModalOpen(true)}
        user={user}
        isHeaderHidden={isHeaderHidden}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Conteúdo Principal de acordo com a Aba */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        {activeTab === 'pdv' && (
          <PDVView
            products={products}
            categories={categories}
            collections={collections}
            currentEvent={currentEvent}
            user={user}
            onGoToProducts={() => handleTabChange('produtos')}
            onGoToEvents={() => setIsEventModalOpen(true)}
            isHeaderHidden={isHeaderHidden}
            setIsHeaderHidden={setIsHeaderHidden}
          />
        )}

        {activeTab === 'vendas' && (
          <VendasList
            sales={sales}
            events={events}
            currentEventId={currentEventId}
            products={products}
            categories={categories}
            collections={collections}
          />
        )}

        {activeTab === 'produtos' && (
          <ProdutosManager
            products={products}
            categories={categories}
            collections={collections}
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

      {/* Notificações em Tela (Toasts) */}
      <ToastContainer />

      {/* Modais de Confirmação na Tela */}
      <ConfirmModal />
    </div>
  );
}
