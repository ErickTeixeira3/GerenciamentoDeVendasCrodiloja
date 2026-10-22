import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';

export default function MultiSelectDropdown({
  icon: Icon,
  iconColor,
  placeholder = 'Selecionar...',
  allLabel = 'Todos',
  itemLabelSingular = 'item',
  itemLabelPlural = 'itens',
  options = [],
  selectedValues = [],
  onChange,
  minWidth = '180px',
  accentColor = 'var(--primary)'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Filtra opções pela busca interna
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase().trim();
    return options.filter((opt) => (opt.label || '').toLowerCase().includes(term));
  }, [options, searchTerm]);

  // Título exibido no botão gatilho
  const triggerLabel = useMemo(() => {
    if (!selectedValues || selectedValues.length === 0) {
      return placeholder;
    }
    if (selectedValues.length === 1) {
      const match = options.find((o) => o.id === selectedValues[0]);
      return match ? match.label : `1 ${itemLabelSingular}`;
    }
    return `${selectedValues.length} ${itemLabelPlural}`;
  }, [selectedValues, options, placeholder, itemLabelSingular, itemLabelPlural]);

  const toggleOption = (id) => {
    if (!onChange) return;
    if (selectedValues.includes(id)) {
      onChange(selectedValues.filter((v) => v !== id));
    } else {
      onChange([...selectedValues, id]);
    }
  };

  const handleSelectAll = () => {
    if (!onChange) return;
    onChange(options.map((o) => o.id));
  };

  const handleClearAll = (e) => {
    if (e) e.stopPropagation();
    if (!onChange) return;
    onChange([]);
  };

  const isAllSelected = options.length > 0 && selectedValues.length === options.length;
  const hasSelection = selectedValues.length > 0;

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Botão Gatilho */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          background: 'var(--bg-surface-elevated)',
          border: hasSelection ? `1.5px solid ${accentColor}` : '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-sm)',
          padding: '6px 10px',
          fontSize: '13px',
          fontWeight: 600,
          color: hasSelection ? accentColor : 'var(--text-primary)',
          cursor: 'pointer',
          outline: 'none',
          minWidth: minWidth,
          transition: 'border-color 0.15s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
          {Icon && <Icon size={14} color={iconColor || (hasSelection ? accentColor : 'var(--text-muted)')} />}
          <span style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '160px'
          }}>
            {triggerLabel}
          </span>
          {selectedValues.length > 1 && (
            <span style={{
              background: accentColor,
              color: '#ffffff',
              borderRadius: 'var(--radius-full)',
              padding: '1px 6px',
              fontSize: '10px',
              fontWeight: 800,
              flexShrink: 0
            }}>
              {selectedValues.length}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {hasSelection && (
            <span
              onClick={handleClearAll}
              title="Limpar seleção"
              style={{
                color: 'var(--text-muted)',
                padding: '2px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown
            size={14}
            style={{
              color: 'var(--text-muted)',
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease'
            }}
          />
        </div>
      </button>

      {/* Popover com Opções e Checkboxes */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          zIndex: 90,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          minWidth: '230px',
          maxWidth: '320px',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          {/* Campo de Busca Rápida Interna se houver mais de 5 opções */}
          {options.length > 5 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--bg-surface-elevated)',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '2px'
            }}>
              <Search size={13} color="var(--text-muted)" />
              <input
                type="text"
                autoFocus
                placeholder={`Buscar ${itemLabelSingular}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  width: '100%',
                  outline: 'none',
                  fontSize: '12px',
                  color: 'var(--text-primary)'
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* Barra de Ações Rápidas (Limpar / Selecionar Todas) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '2px 4px 6px 4px',
            borderBottom: '1px solid var(--border-subtle)',
            fontSize: '11px',
            color: 'var(--text-muted)'
          }}>
            <button
              type="button"
              onClick={handleClearAll}
              disabled={!hasSelection}
              style={{
                background: 'transparent',
                border: 'none',
                color: hasSelection ? 'var(--primary)' : 'var(--text-muted)',
                cursor: hasSelection ? 'pointer' : 'default',
                fontWeight: 600,
                fontSize: '11px',
                padding: '2px 4px'
              }}
            >
              {allLabel}
            </button>

            <button
              type="button"
              onClick={handleSelectAll}
              disabled={isAllSelected}
              style={{
                background: 'transparent',
                border: 'none',
                color: !isAllSelected ? 'var(--primary)' : 'var(--text-muted)',
                cursor: !isAllSelected ? 'pointer' : 'default',
                fontWeight: 600,
                fontSize: '11px',
                padding: '2px 4px'
              }}
            >
              Marcar todas
            </button>
          </div>

          {/* Lista de Opções Rolável */}
          <div style={{
            maxHeight: '220px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '8px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                Nenhum resultado
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = selectedValues.includes(opt.id);
                return (
                  <label
                    key={opt.id}
                    onClick={() => toggleOption(opt.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-sm)',
                      background: isChecked ? 'var(--primary-light)' : 'transparent',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: isChecked ? 'var(--primary)' : 'var(--text-primary)',
                      fontWeight: isChecked ? 700 : 500,
                      userSelect: 'none',
                      transition: 'background 0.1s ease'
                    }}
                  >
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '4px',
                      border: isChecked ? `2px solid ${accentColor}` : '1.5px solid var(--border-strong)',
                      background: isChecked ? accentColor : 'var(--bg-surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {isChecked && <Check size={11} color="#ffffff" strokeWidth={3} />}
                    </div>

                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {opt.label}
                    </span>

                    {opt.count !== undefined && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                        {opt.count}
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
