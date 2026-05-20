import React, { useEffect, useRef } from 'react';

/**
 * Componente premium de Canvas que dibuja una explosión de confeti y partículas brillantes neón.
 * @param {Function} onComplete Callback llamado cuando finaliza la animación (todas las partículas se desvanecieron).
 */
export default function ConfettiCanvas({ onComplete }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Ajustar tamaño del canvas a pantalla completa
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const particles = [];
    const colors = [
      '#8b5cf6', // Violeta neón
      '#a78bfa',
      '#10b981', // Esmeralda neón
      '#34d399',
      '#ec4899', // Rosa neón
      '#f472b6',
      '#3b82f6', // Azul neón
      '#ffd700', // Oro
      '#ffffff'  // Destello blanco
    ];

    // --- FÍSICA Y CLASES DE PARTÍCULAS ---

    // 1. Confeti rectangular y circular clásico
    class Confetti {
      constructor() {
        // Salen de los costados inferiores (cañón izquierdo y derecho)
        this.side = Math.random() > 0.5 ? 'left' : 'right';
        this.x = this.side === 'left' ? 0 : canvas.width;
        this.y = canvas.height * 0.8;
        
        const angle = this.side === 'left' ? -Math.PI / 4 : -Math.PI * 3 / 4;
        const speed = 15 + Math.random() * 15;
        const spread = (Math.random() - 0.5) * 0.4; // dispersión
        
        this.vx = Math.cos(angle + spread) * speed;
        this.vy = Math.sin(angle + spread) * speed;
        
        this.sizeWidth = 6 + Math.random() * 8;
        this.sizeHeight = 12 + Math.random() * 8;
        this.isCircle = Math.random() > 0.7;
        
        // Asignación de color aleatorio de la paleta neón
        this.color = colors[Math.floor(Math.random() * colors.length)];
        
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
        this.gravity = 0.25 + Math.random() * 0.25;
        this.drag = 0.96; // resistencia del aire
        this.opacity = 1;
        this.decay = 0.003 + Math.random() * 0.004;
        
        // Oscilación horizontal suave
        this.wobble = Math.random() * Math.PI * 2;
        this.wobbleSpeed = 0.05 + Math.random() * 0.05;
      }

      update() {
        this.vx *= this.drag;
        this.vy += this.gravity;
        this.vy *= this.drag;
        this.x += this.vx;
        this.y += this.vy;
        
        this.rotation += this.rotationSpeed;
        this.wobble += this.wobbleSpeed;
        
        // Modificación suave de opacidad
        if (this.y > canvas.height * 0.6) {
          this.opacity -= this.decay * 2;
        } else {
          this.opacity -= this.decay;
        }
      }

      draw() {
        if (this.opacity <= 0) return;
        ctx.save();
        ctx.translate(this.x + Math.sin(this.wobble) * 4, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        
        // Neon Glow para el confeti
        ctx.shadowBlur = 4;
        ctx.shadowColor = this.color;

        if (this.isCircle) {
          ctx.beginPath();
          ctx.arc(0, 0, this.sizeWidth / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-this.sizeWidth / 2, -this.sizeHeight / 2, this.sizeWidth, this.sizeHeight);
        }
        ctx.restore();
      }
    }

    // 2. Partículas destellantes de estrellas premium (Glitter/Sparkles)
    class Sparkle {
      constructor() {
        // Brotan desde una explosión en el centro de la pantalla
        this.x = canvas.width / 2 + (Math.random() - 0.5) * 100;
        this.y = canvas.height * 0.4 + (Math.random() - 0.5) * 100;
        
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 6;
        
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - 1.5; // empuje extra ascendente
        
        this.size = 4 + Math.random() * 8;
        this.color = Math.random() > 0.5 ? '#ffd700' : '#ffffff'; // Oro o blanco
        this.gravity = 0.05;
        this.drag = 0.98;
        this.opacity = 1;
        this.decay = 0.01 + Math.random() * 0.015;
      }

      update() {
        this.vx *= this.drag;
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.opacity -= this.decay;
      }

      draw() {
        if (this.opacity <= 0) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        
        // Brillo premium intenso
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        
        // Dibujar estrella premium de 4 puntas (diamante destellante)
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.quadraticCurveTo(0, 0, this.size, 0);
        ctx.quadraticCurveTo(0, 0, 0, this.size);
        ctx.quadraticCurveTo(0, 0, -this.size, 0);
        ctx.quadraticCurveTo(0, 0, 0, -this.size);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
      }
    }

    // --- INICIALIZACIÓN ---
    
    // Ráfaga inicial masiva
    const initConfettiBurst = () => {
      // 120 pedazos de confeti desde los cañones inferiores
      for (let i = 0; i < 150; i++) {
        particles.push(new Confetti());
      }
      // 80 destellos de estrellas mágicas desde el centro
      for (let i = 0; i < 90; i++) {
        particles.push(new Sparkle());
      }
    };
    
    initConfettiBurst();

    // --- ANIMATION LOOP (60FPS) ---
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Actualizar y dibujar partículas
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw();

        // Eliminar partículas desvanecidas
        if (p.opacity <= 0 || p.y > canvas.height + 20) {
          particles.splice(i, 1);
        }
      }

      // Si ya no quedan partículas en movimiento, terminar animación
      if (particles.length === 0) {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', resizeCanvas);
        if (onComplete) onComplete();
      } else {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    tick();

    // Limpieza al desmontar
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [onComplete]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
        background: 'transparent'
      }}
    />
  );
}
