import { useEffect, useRef } from 'react';

export default function AnimatedBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    class Particle {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedY = -(Math.random() * 0.3 + 0.1);
        this.speedX = (Math.random() - 0.5) * 0.2;
        this.opacity = Math.random() * 0.5 + 0.1;
        this.twinkleSpeed = Math.random() * 0.02 + 0.005;
        this.twinklePhase = Math.random() * Math.PI * 2;
        this.isStar = Math.random() > 0.6;
      }
      update() {
        this.y += this.speedY;
        this.x += this.speedX;
        this.twinklePhase += this.twinkleSpeed;
        this.opacity = 0.1 + Math.abs(Math.sin(this.twinklePhase)) * 0.5;
        if (this.y < -10 || this.x < -10 || this.x > canvas.width + 10) {
          this.reset();
          this.y = canvas.height + 10;
        }
      }
      draw() {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        if (this.isStar) {
          ctx.fillStyle = '#7ba4e8';
          const s = this.size;
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI) / 2;
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(
              this.x + Math.cos(angle) * s * 2,
              this.y + Math.sin(angle) * s * 2
            );
          }
          ctx.fill();
          ctx.beginPath();
          ctx.arc(this.x, this.y, s * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = '#a8c8ff';
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fillStyle = '#5b8bd4';
          ctx.fill();
        }
        ctx.restore();
      }
    }

    for (let i = 0; i < 60; i++) {
      particles.push(new Particle());
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }}
    />
  );
}
