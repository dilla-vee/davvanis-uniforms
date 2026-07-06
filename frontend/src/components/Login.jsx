import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../utils/api';
import { Eye, EyeOff, Lock, User, ShieldCheck } from 'lucide-react';

// AnimatedFormField Component
const AnimatedFormField = ({
  type,
  placeholder,
  value,
  onChange,
  icon,
  showToggle,
  onToggle,
  showPassword
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  return (
    <div className="relative group">
      <div
        className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-950/60 transition-all duration-300 ease-in-out focus-within:border-[#00e676]/50"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200 group-focus-within:text-[#00e676]">
          {icon}
        </div>
        
        <input
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="w-full bg-transparent pl-10 pr-12 py-3 text-white placeholder:text-slate-500 focus:outline-none text-sm"
          placeholder=""
        />
        
        <label className={`absolute left-10 transition-all duration-200 pointer-events-none ${
          isFocused || value 
            ? 'top-2 text-[10px] text-[#00e676] font-medium' 
            : 'top-1/2 -translate-y-1/2 text-sm text-slate-400'
        }`}>
          {placeholder}
        </label>

        {showToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}

        {isHovering && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(150px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(0, 230, 118, 0.12) 0%, transparent 70%)`
            }}
          />
        )}
      </div>
    </div>
  );
};

// FloatingParticles Component
const FloatingParticles = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 1;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.speedY = (Math.random() - 0.5) * 0.3;
        this.opacity = Math.random() * 0.4;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > canvas.width) this.x = 0;
        if (this.x < 0) this.x = canvas.width;
        if (this.y > canvas.height) this.y = 0;
        if (this.y < 0) this.y = canvas.height;
      }

      draw() {
        if (!ctx) return;
        ctx.fillStyle = `rgba(0, 230, 118, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const particles = [];
    const particleCount = 40;

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    let animationId;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', setCanvasSize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10"
    />
  );
};

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim() || !password.trim()) {
      setError('Please fill in both fields.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed. Please check credentials.');
      }
      
      // Save session info
      localStorage.setItem('unistore_token', data.token);
      localStorage.setItem('unistore_user', JSON.stringify(data.user));
      
      // Notify parent app
      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center p-4 relative overflow-hidden bg-black select-none">
      {/* Background Tailor Shop Image with overlay */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <div className="absolute inset-0 bg-black/65 z-10" />
        <img
          src="/login-bg.jpg"
          className="absolute inset-0 w-full h-full object-cover"
          alt="Tailor shop background"
        />
      </div>

      <FloatingParticles />
      
      <div className="relative z-20 w-full max-w-md">
        <div className="bg-slate-950/65 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <img
              src="/davannis-logo.svg"
              alt="Davannis Uniforms"
              className="mx-auto mb-4 h-36 w-auto max-w-[220px]"
            />
            <h1 className="text-3xl font-extrabold text-white mb-1 tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Davannis Uniforms
            </h1>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">
              UniStore POS System
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-950/40 border border-red-900/50 text-red-400 text-xs font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatedFormField
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              icon={<User size={18} />}
            />

            <AnimatedFormField
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock size={18} />}
              showToggle
              onToggle={() => setShowPassword(!showPassword)}
              showPassword={showPassword}
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-[#00e676] bg-slate-900 border-white/10 rounded focus:ring-[#00e676] focus:ring-2"
                />
                <span className="text-xs text-slate-400">Remember me</span>
              </label>
              
              <button
                type="button"
                className="text-xs text-slate-400 hover:text-white transition-colors"
                onClick={() => alert("Please contact your administrator to reset your password.")}
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group bg-[#00e676] text-black py-3 px-4 rounded-xl font-bold text-sm transition-all duration-300 ease-in-out hover:bg-[#00c853] focus:outline-none focus:ring-2 focus:ring-[#00e676] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden shadow-lg shadow-[#00e676]/20 hover:shadow-[#00e676]/30"
            >
              <span className={`transition-opacity duration-200 ${loading ? 'opacity-0' : 'opacity-100'}`}>
                Sign In
              </span>
              
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
            <ShieldCheck size={12} className="text-[#00e676]" />
            <span>Secure Retail POS Access</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-slate-500 z-20">
        UniStore © 2026 • Secure Retail Access
      </div>
    </div>
  );
}
