import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { Lock, Mail, Eye, EyeOff, LogIn, AlertCircle, Sun, Moon } from 'lucide-react';

export default function LoginScreen({ theme = 'light', toggleTheme = () => {} }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Por favor, preencha o e-mail e a senha.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      console.error("Erro no login:", err);
      if (
        err.code === 'auth/invalid-credential' || 
        err.code === 'auth/wrong-password' || 
        err.code === 'auth/user-not-found'
      ) {
        setErrorMsg("E-mail ou senha incorretos.");
      } else if (err.code === 'auth/too-many-requests') {
        setErrorMsg("Muitas tentativas sem sucesso. Aguarde um momento.");
      } else if (err.code === 'auth/network-request-failed') {
        setErrorMsg("Falha de conexão. Verifique sua internet.");
      } else {
        setErrorMsg("Erro ao entrar: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'radial-gradient(circle at 50% 20%, var(--bg-surface-elevated) 0%, var(--bg-main) 80%)',
      position: 'relative'
    }}>
      {/* Botão de Alternar Modo Claro / Escuro na Tela de Login */}
      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'var(--bg-surface-elevated)',
          color: theme === 'dark' ? '#f59e0b' : 'var(--primary)',
          border: '1px solid var(--border-strong)',
          width: '40px',
          height: '40px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: 'var(--bg-surface)',
        borderRadius: '24px',
        border: '1px solid var(--border-strong)',
        padding: '36px 28px',
        boxShadow: 'var(--shadow-lg)'
      }} className="animate-fade-in">
        {/* Logo e Cabeçalho */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '76px',
            height: '76px',
            borderRadius: '20px',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-strong)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px',
            boxShadow: 'var(--shadow-md)',
            marginBottom: '16px'
          }}>
            <img 
              src="/logoCrodiloja.svg" 
              alt="Crodiloja" 
              className="crodiloja-logo" 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
            />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Crodiloja
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '6px' }}>
            Sistema de gerenciamento de vendas
          </p>
        </div>

        {/* Mensagem de Erro */}
        {errorMsg && (
          <div style={{
            background: 'var(--danger-light)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px'
          }}>
            <AlertCircle size={16} color="var(--danger)" style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Formulário de Login */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              E-mail
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
              <input
                type="email"
                required
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: '38px',
                  height: '46px',
                  borderRadius: 'var(--radius-md)'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Senha
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: '38px',
                  paddingRight: '40px',
                  height: '46px',
                  borderRadius: 'var(--radius-md)'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
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
              gap: '8px',
              marginTop: '8px',
              boxShadow: '0 4px 16px rgba(56, 189, 248, 0.4)',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? (
              <span>Entrando...</span>
            ) : (
              <>
                <LogIn size={18} />
                <span>Entrar no Sistema</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
