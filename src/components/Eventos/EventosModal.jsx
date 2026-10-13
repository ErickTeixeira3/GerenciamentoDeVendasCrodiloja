import React, { useState, useMemo } from 'react';
import { Calendar, Plus, X, Check, Edit3, Trash2, CheckCircle2 } from 'lucide-react';
import { addEvent, updateEvent, deleteEvent } from '../../services/firestoreService';
import { toast } from '../Common/ToastContainer';
import { confirmDialog } from '../Common/ConfirmModal';

export default function EventosModal({ isOpen, onClose, events = [], currentEventId, setCurrentEventId }) {
  const [nome, setNome] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edição de evento
  const [editingEventId, setEditingEventId] = useState(null);
  const [editingEventName, setEditingEventName] = useState('');

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
  }, [events]);

  if (!isOpen) return null;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!nome.trim()) return;

    try {
      setIsSubmitting(true);
      const docRef = await addEvent(nome.trim());
      setCurrentEventId(docRef.id);
      toast.success(`Evento "${nome.trim()}" criado com sucesso!`);
      setNome('');
    } catch (err) {
      toast.error("Erro ao cadastrar evento: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (ev, e) => {
    e.stopPropagation();
    setEditingEventId(ev.id);
    setEditingEventName(ev.nome);
  };

  const handleSaveEdit = async (evId, e) => {
    e.stopPropagation();
    if (!editingEventName.trim()) return;

    try {
      await updateEvent(evId, editingEventName.trim());
      toast.success("Evento atualizado!");
      setEditingEventId(null);
    } catch (err) {
      toast.error("Erro ao renomear evento: " + err.message);
    }
  };

  const handleDelete = async (evId, evNome, e) => {
    e.stopPropagation();
    const confirmed = await confirmDialog({
      title: "Excluir Evento",
      message: `Tem certeza que deseja excluir o evento "${evNome}"?`,
      confirmText: "Sim, excluir",
      cancelText: "Cancelar",
      danger: true
    });

    if (confirmed) {
      try {
        await deleteEvent(evId);
        if (currentEventId === evId) {
          const remaining = events.filter(e => e.id !== evId);
          setCurrentEventId(remaining[0]?.id || '');
        }
        toast.success(`Evento "${evNome}" excluído.`);
      } catch (err) {
        toast.error("Erro ao excluir evento: " + err.message);
      }
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      zIndex: 70,
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
        maxWidth: '460px',
        width: '100%'
      }} className="animate-fade-in">
        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} color="var(--primary)" />
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Gerenciar Eventos / Feiras
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Formulário Novo Evento */}
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Criar Novo Evento
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              required
              placeholder="Ex: Feira da Liberdade - Outubro"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                background: 'var(--primary)',
                color: '#fff',
                padding: '0 16px',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Plus size={16} /> Criar
            </button>
          </div>
        </form>

        {/* Lista de Eventos Existentes */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
            EVENTOS CADASTRADOS (CLIQUE PARA SELECIONAR)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto' }}>
            {sortedEvents.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>
                Nenhum evento criado ainda.
              </div>
            ) : (
              sortedEvents.map((ev) => {
                const isSelected = ev.id === currentEventId;
                const isEditing = editingEventId === ev.id;

                return (
                  <div
                    key={ev.id}
                    onClick={() => {
                      if (!isEditing) {
                        setCurrentEventId(ev.id);
                        onClose();
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'var(--primary-light)' : 'var(--bg-surface-elevated)',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                      cursor: isEditing ? 'default' : 'pointer',
                      gap: '8px'
                    }}
                  >
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
                        <input
                          type="text"
                          value={editingEventName}
                          onChange={(e) => setEditingEventName(e.target.value)}
                          autoFocus
                          style={{ flex: 1, padding: '4px 8px', fontSize: '13px' }}
                        />
                        <button
                          type="button"
                          onClick={(e) => handleSaveEdit(ev.id, e)}
                          style={{
                            background: 'var(--primary)',
                            color: '#fff',
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-sm)'
                          }}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingEventId(null);
                          }}
                          style={{
                            background: 'var(--bg-surface-hover)',
                            color: 'var(--text-secondary)',
                            padding: '4px 8px',
                            borderRadius: 'var(--radius-sm)'
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                          {isSelected && <CheckCircle2 size={16} color="var(--primary)" />}
                          <span style={{
                            fontWeight: 600,
                            fontSize: '14px',
                            color: isSelected ? 'var(--primary)' : 'var(--text-primary)'
                          }}>
                            {ev.nome}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={(e) => handleStartEdit(ev, e)}
                            title="Renomear evento"
                            style={{
                              background: 'transparent',
                              color: 'var(--text-muted)',
                              padding: '6px',
                              borderRadius: 'var(--radius-sm)'
                            }}
                          >
                            <Edit3 size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDelete(ev.id, ev.nome, e)}
                            title="Excluir evento"
                            style={{
                              background: 'transparent',
                              color: 'var(--danger)',
                              padding: '6px',
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
      </div>
    </div>
  );
}
