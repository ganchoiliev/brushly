import { useState, useEffect, useRef, useCallback } from "react";

// ─── SMOOTH SCROLL ENGINE ───────────────────────────────────────────────────
// Simulates Lenis-style momentum scrolling with lerp interpolation
function useSmoothScroll() {
  const scrollRef = useRef({ current: 0, target: 0, ease: 0.08 });
  const rafRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const state = scrollRef.current;
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e) => {
      e.preventDefault();
      state.target += e.deltaY;
      state.target = Math.max(0, Math.min(state.target, container.scrollHeight - window.innerHeight));
    };

    // Touch support
    let touchStart = 0;
    const onTouchStart = (e) => { touchStart = e.touches[0].clientY; };
    const onTouchMove = (e) => {
      e.preventDefault();
      const delta = touchStart - e.touches[0].clientY;
      touchStart = e.touches[0].clientY;
      state.target += delta * 1.5;
      state.target = Math.max(0, Math.min(state.target, container.scrollHeight - window.innerHeight));
    };

    const animate = () => {
      state.current += (state.target - state.current) * state.ease;
      if (container) {
        container.style.transform = `translateY(${-state.current}px)`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { containerRef, scrollRef };
}

// ─── SCROLL REVEAL HOOK ─────────────────────────────────────────────────────
// GSAP ScrollTrigger equivalent — triggers animation when element enters viewport
function useScrollReveal(options = {}) {
  const { threshold = 0.15, delay = 0 } = options;
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: "0px 0px -60px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, delay]);

  return { ref, isVisible };
}

// ─── MAGNETIC BUTTON ─────────────────────────────────────────────────────────
function MagneticButton({ children, className = "", onClick }) {
  const btnRef = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const rect = btnRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.25;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.25;
    setPos({ x, y });
  };

  const handleMouseLeave = () => setPos({ x: 0, y: 0 });

  return (
    <button
      ref={btnRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={className}
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        transition: pos.x === 0 ? "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)" : "transform 0.15s ease-out",
      }}
    >
      {children}
    </button>
  );
}

// ─── TEXT REVEAL ─────────────────────────────────────────────────────────────
function TextReveal({ text, tag = "h2", className = "", delay = 0 }) {
  const { ref, isVisible } = useScrollReveal({ delay });
  const words = text.split(" ");
  const Tag = tag;

  return (
    <Tag ref={ref} className={className} style={{ overflow: "hidden" }}>
      {words.map((word, i) => (
        <span key={i} style={{ display: "inline-block", overflow: "hidden", marginRight: "0.3em" }}>
          <span
            style={{
              display: "inline-block",
              transform: isVisible ? "translateY(0)" : "translateY(110%)",
              opacity: isVisible ? 1 : 0,
              transition: `transform 1s cubic-bezier(0.22, 1, 0.36, 1) ${i * 0.05 + 0.1}s, opacity 0.8s ease ${i * 0.05 + 0.1}s`,
            }}
          >
            {word}
          </span>
        </span>
      ))}
    </Tag>
  );
}

// ─── PARALLAX IMAGE ──────────────────────────────────────────────────────────
function ParallaxImage({ src, alt, speed = 0.15, className = "" }) {
  const containerRef = useRef(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let raf;
    const animate = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const viewH = window.innerHeight;
        const progress = (viewH - rect.top) / (viewH + rect.height);
        setOffset((progress - 0.5) * speed * rect.height);
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [speed]);

  return (
    <div ref={containerRef} className={className} style={{ overflow: "hidden", position: "relative" }}>
      <img
        src={src}
        alt={alt}
        style={{
          width: "100%",
          height: "120%",
          objectFit: "cover",
          transform: `translateY(${offset}px)`,
          willChange: "transform",
          position: "absolute",
          top: "-10%",
          left: 0,
        }}
      />
    </div>
  );
}

// ─── SCROLL REVEAL WRAPPER ───────────────────────────────────────────────────
function ScrollReveal({ children, delay = 0, y = 60, className = "" }) {
  const { ref, isVisible } = useScrollReveal({ delay });

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transform: isVisible ? "translateY(0)" : `translateY(${y}px)`,
        opacity: isVisible ? 1 : 0,
        transition: `transform 1.2s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, opacity 1s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── HORIZONTAL RULE REVEAL ──────────────────────────────────────────────────
function LineReveal({ delay = 0 }) {
  const { ref, isVisible } = useScrollReveal({ delay });
  return (
    <div ref={ref} style={{ overflow: "hidden", padding: "2px 0" }}>
      <div
        style={{
          height: "1px",
          background: "rgba(200, 169, 110, 0.3)",
          transform: isVisible ? "scaleX(1)" : "scaleX(0)",
          transformOrigin: "left",
          transition: `transform 1.4s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
        }}
      />
    </div>
  );
}

// ─── PAGE LOADER ─────────────────────────────────────────────────────────────
function PageLoader({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 15 + 5;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setTimeout(() => setExiting(true), 300);
        setTimeout(() => onComplete(), 1200);
      }
      setProgress(Math.min(p, 100));
    }, 80);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#1A1A1A",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transform: exiting ? "translateY(-100%)" : "translateY(0)",
        transition: "transform 0.9s cubic-bezier(0.76, 0, 0.24, 1)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(28px, 5vw, 48px)",
            color: "#C8A96E",
            letterSpacing: "0.15em",
            fontWeight: 300,
            marginBottom: "40px",
            opacity: exiting ? 0 : 1,
            transition: "opacity 0.4s ease",
          }}
        >
          BRUSHLY
        </div>
        <div style={{ width: "200px", height: "1px", background: "rgba(255,255,255,0.1)", position: "relative" }}>
          <div
            style={{
              height: "100%",
              background: "#C8A96E",
              width: `${progress}%`,
              transition: "width 0.3s ease-out",
            }}
          />
        </div>
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "11px",
            color: "rgba(255,255,255,0.3)",
            marginTop: "16px",
            letterSpacing: "0.2em",
            opacity: exiting ? 0 : 1,
            transition: "opacity 0.3s ease",
          }}
        >
          {Math.round(progress)}%
        </div>
      </div>
    </div>
  );
}

// ─── NAV ─────────────────────────────────────────────────────────────────────
function Header({ scrolled }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const links = ["Services", "Gallery", "About", "Contact"];

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        padding: scrolled ? "16px 0" : "28px 0",
        background: scrolled ? "rgba(26, 26, 26, 0.95)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(200, 169, 110, 0.1)" : "1px solid transparent",
        transition: "all 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 clamp(20px, 4vw, 60px)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "22px", color: "#C8A96E", letterSpacing: "0.15em", fontWeight: 400 }}>
          BRUSHLY
        </div>
        <nav style={{ display: "flex", gap: "40px", alignItems: "center" }}>
          {links.map((link) => (
            <a
              key={link}
              href="#"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
                color: "rgba(255,255,255,0.7)",
                textDecoration: "none",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                position: "relative",
                display: window.innerWidth > 768 ? "block" : "none",
              }}
              onMouseEnter={(e) => { e.target.style.color = "#C8A96E"; }}
              onMouseLeave={(e) => { e.target.style.color = "rgba(255,255,255,0.7)"; }}
            >
              {link}
            </a>
          ))}
          <MagneticButton>
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "12px",
                color: "#1A1A1A",
                background: "#C8A96E",
                padding: "12px 28px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                display: "inline-block",
                cursor: "pointer",
              }}
            >
              Get a Quote
            </span>
          </MagneticButton>
        </nav>
      </div>
    </header>
  );
}

// ─── HERO ────────────────────────────────────────────────────────────────────
function HeroSection() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 200);
  }, []);

  return (
    <section style={{ height: "100vh", position: "relative", overflow: "hidden", background: "#1A1A1A" }}>
      {/* Video placeholder — in production, this is a real <video> with poster frame */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url(https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=1920&q=80)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "brightness(0.4)",
          transform: loaded ? "scale(1)" : "scale(1.1)",
          transition: "transform 1.8s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />

      {/* Gradient overlay */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(26,26,26,0.3) 0%, rgba(26,26,26,0.8) 100%)" }} />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "0 clamp(20px, 4vw, 60px) clamp(60px, 10vh, 120px)",
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        <div style={{ overflow: "hidden", marginBottom: "8px" }}>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "12px",
              color: "#C8A96E",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              transform: loaded ? "translateY(0)" : "translateY(100%)",
              transition: "transform 1s cubic-bezier(0.22, 1, 0.36, 1) 0.4s",
            }}
          >
            Premium Painting & Decorating — Surrey, Epsom & Reigate
          </div>
        </div>

        <div style={{ overflow: "hidden", marginBottom: "12px" }}>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(40px, 7vw, 96px)",
              fontWeight: 300,
              color: "#FAFAFA",
              lineHeight: 1.05,
              margin: 0,
              transform: loaded ? "translateY(0)" : "translateY(100%)",
              transition: "transform 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.5s",
            }}
          >
            Walls That
          </h1>
        </div>
        <div style={{ overflow: "hidden", marginBottom: "32px" }}>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(40px, 7vw, 96px)",
              fontWeight: 300,
              color: "#FAFAFA",
              lineHeight: 1.05,
              margin: 0,
              transform: loaded ? "translateY(0)" : "translateY(100%)",
              transition: "transform 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.65s",
            }}
          >
            Speak <span style={{ color: "#C8A96E", fontStyle: "italic" }}>Volumes</span>
          </h1>
        </div>

        <div style={{ overflow: "hidden" }}>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "clamp(15px, 1.2vw, 18px)",
              color: "rgba(255,255,255,0.6)",
              maxWidth: "480px",
              lineHeight: 1.7,
              margin: 0,
              transform: loaded ? "translateY(0)" : "translateY(100%)",
              opacity: loaded ? 1 : 0,
              transition: "transform 1s cubic-bezier(0.22, 1, 0.36, 1) 0.9s, opacity 0.8s ease 0.9s",
            }}
          >
            Flawless finishes for homes and businesses that demand more than just a coat of paint.
          </p>
        </div>

        {/* Scroll indicator */}
        <div
          style={{
            position: "absolute",
            bottom: "30px",
            right: "clamp(20px, 4vw, 60px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
            opacity: loaded ? 0.5 : 0,
            transition: "opacity 1s ease 1.5s",
          }}
        >
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "10px", color: "#fff", letterSpacing: "0.2em", textTransform: "uppercase", writingMode: "vertical-rl" }}>
            Scroll
          </span>
          <div style={{ width: "1px", height: "40px", background: "rgba(255,255,255,0.3)", position: "relative", overflow: "hidden" }}>
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "#C8A96E",
                animation: "scrollDown 2s ease-in-out infinite",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── SERVICES SECTION ────────────────────────────────────────────────────────
function ServicesSection() {
  const services = [
    { num: "01", title: "Interior Painting", desc: "Precision-applied finishes for living spaces, bedrooms, and commercial interiors. Every edge clean, every surface flawless.", img: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&q=80" },
    { num: "02", title: "Exterior Painting", desc: "Weather-resistant coatings applied with meticulous prep work. Your property's first impression, perfected.", img: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80" },
    { num: "03", title: "Wallpapering", desc: "Pattern-matched installation with surgical precision. From classic prints to bold contemporary statements.", img: "https://images.unsplash.com/photo-1615529328331-f8917597711f?w=600&q=80" },
    { num: "04", title: "Specialist Finishes", desc: "Venetian plaster, limewash, colour washing, and bespoke decorative techniques for spaces that demand distinction.", img: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=80" },
  ];

  return (
    <section style={{ background: "#F5F0EB", padding: "clamp(80px, 12vw, 160px) 0" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 clamp(20px, 4vw, 60px)" }}>
        <ScrollReveal>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "16px", flexWrap: "wrap", gap: "20px" }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "#C8A96E", letterSpacing: "0.3em", textTransform: "uppercase" }}>
              What We Do
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "rgba(26,26,26,0.5)", maxWidth: "360px", lineHeight: 1.7 }}>
              Every project receives the same obsessive attention to preparation, product selection, and execution.
            </div>
          </div>
        </ScrollReveal>

        <LineReveal delay={200} />

        {services.map((service, i) => (
          <div key={service.num}>
            <ScrollReveal delay={i * 100}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: "clamp(20px, 4vw, 60px)",
                  alignItems: "center",
                  padding: "clamp(30px, 4vw, 50px) 0",
                  cursor: "pointer",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  const img = e.currentTarget.querySelector("[data-service-img]");
                  if (img) img.style.opacity = "1";
                  e.currentTarget.querySelector("[data-title]").style.color = "#C8A96E";
                }}
                onMouseLeave={(e) => {
                  const img = e.currentTarget.querySelector("[data-service-img]");
                  if (img) img.style.opacity = "0";
                  e.currentTarget.querySelector("[data-title]").style.color = "#1A1A1A";
                }}
              >
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "rgba(26,26,26,0.3)", letterSpacing: "0.1em" }}>
                  {service.num}
                </span>
                <div>
                  <h3
                    data-title
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: "clamp(28px, 4vw, 52px)",
                      fontWeight: 300,
                      color: "#1A1A1A",
                      margin: "0 0 8px 0",
                      transition: "color 0.5s ease",
                    }}
                  >
                    {service.title}
                  </h3>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "rgba(26,26,26,0.5)", margin: 0, maxWidth: "400px", lineHeight: 1.6, display: window.innerWidth > 640 ? "block" : "none" }}>
                    {service.desc}
                  </p>
                </div>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: "rgba(26,26,26,0.2)" }}>
                  <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>

                {/* Hover image preview — Aventura-style */}
                <div
                  data-service-img
                  style={{
                    position: "absolute",
                    right: "80px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "280px",
                    height: "180px",
                    overflow: "hidden",
                    opacity: 0,
                    transition: "opacity 0.5s ease",
                    pointerEvents: "none",
                    zIndex: 10,
                    display: window.innerWidth > 1024 ? "block" : "none",
                  }}
                >
                  <img src={service.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              </div>
            </ScrollReveal>
            <LineReveal delay={i * 100 + 50} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── SHOWCASE / GALLERY SECTION ──────────────────────────────────────────────
function ShowcaseSection() {
  return (
    <section style={{ background: "#1A1A1A", padding: "clamp(80px, 12vw, 160px) 0", overflow: "hidden" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 clamp(20px, 4vw, 60px)" }}>
        <ScrollReveal>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "#C8A96E", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "24px" }}>
            Selected Work
          </div>
        </ScrollReveal>

        <TextReveal
          text="Every surface tells a story"
          tag="h2"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(32px, 5vw, 64px)",
            fontWeight: 300,
            color: "#FAFAFA",
            margin: "0 0 clamp(40px, 6vw, 80px) 0",
            lineHeight: 1.1,
          }}
        />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: "clamp(16px, 2vw, 30px)" }}>
          {[
            { img: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=700&q=80", title: "Victorian Restoration", location: "Epsom, Surrey" },
            { img: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=700&q=80", title: "Modern Penthouse", location: "Reigate, Surrey" },
            { img: "https://images.unsplash.com/photo-1600566753376-12c8ab7c5a0c?w=700&q=80", title: "Commercial Fit-Out", location: "Leatherhead, Surrey" },
          ].map((project, i) => (
            <ScrollReveal key={i} delay={i * 150}>
              <div
                style={{ position: "relative", overflow: "hidden", cursor: "pointer", aspectRatio: "4/5" }}
                onMouseEnter={(e) => {
                  e.currentTarget.querySelector("img").style.transform = "scale(1.05)";
                  e.currentTarget.querySelector("[data-overlay]").style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.querySelector("img").style.transform = "scale(1)";
                  e.currentTarget.querySelector("[data-overlay]").style.opacity = "0";
                }}
              >
                <img
                  src={project.img}
                  alt={project.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)" }}
                />
                <div
                  data-overlay
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(to top, rgba(26,26,26,0.9) 0%, transparent 50%)",
                    opacity: 0,
                    transition: "opacity 0.5s ease",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    padding: "30px",
                  }}
                >
                  <h4 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", color: "#FAFAFA", margin: "0 0 4px 0", fontWeight: 400 }}>
                    {project.title}
                  </h4>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#C8A96E", letterSpacing: "0.1em" }}>
                    {project.location}
                  </span>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── TESTIMONIAL SECTION ─────────────────────────────────────────────────────
function TestimonialSection() {
  const [active, setActive] = useState(0);
  const testimonials = [
    { quote: "Brushly transformed our home beyond what we imagined. The attention to detail in every room was extraordinary — you can see the difference quality makes.", name: "Sarah & James K.", location: "Epsom, Surrey" },
    { quote: "Professional from start to finish. The preparation work alone showed us why they're different from every other painter we've used before.", name: "Mark T.", location: "Reigate, Surrey" },
    { quote: "We hired them for our office fit-out and they delivered on time, on budget, with a finish that our clients constantly compliment.", name: "David L.", location: "Leatherhead, Surrey" },
  ];

  useEffect(() => {
    const interval = setInterval(() => setActive((p) => (p + 1) % testimonials.length), 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section style={{ background: "#F5F0EB", padding: "clamp(80px, 12vw, 160px) 0" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "0 clamp(20px, 4vw, 60px)", textAlign: "center" }}>
        <ScrollReveal>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "#C8A96E", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "clamp(32px, 5vw, 60px)" }}>
            Client Testimonials
          </div>
        </ScrollReveal>

        <div style={{ position: "relative", minHeight: "200px" }}>
          {testimonials.map((t, i) => (
            <div
              key={i}
              style={{
                position: i === active ? "relative" : "absolute",
                top: 0, left: 0, right: 0,
                opacity: i === active ? 1 : 0,
                transform: i === active ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.8s ease, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
                pointerEvents: i === active ? "auto" : "none",
              }}
            >
              <blockquote style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(22px, 3vw, 34px)", fontWeight: 300, color: "#1A1A1A", lineHeight: 1.5, margin: "0 0 32px 0", fontStyle: "italic" }}>
                "{t.quote}"
              </blockquote>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "rgba(26,26,26,0.7)", letterSpacing: "0.05em" }}>
                {t.name} <span style={{ color: "rgba(26,26,26,0.3)", margin: "0 8px" }}>—</span> {t.location}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "40px" }}>
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{
                width: i === active ? "32px" : "8px",
                height: "8px",
                background: i === active ? "#C8A96E" : "rgba(26,26,26,0.15)",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                transition: "all 0.4s ease",
                padding: 0,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA SECTION ─────────────────────────────────────────────────────────────
function CTASection() {
  return (
    <section style={{ background: "#1A1A1A", padding: "clamp(80px, 12vw, 140px) 0", textAlign: "center", position: "relative", overflow: "hidden" }}>
      {/* Subtle radial glow */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "800px", height: "800px", background: "radial-gradient(circle, rgba(200,169,110,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "0 clamp(20px, 4vw, 60px)", position: "relative", zIndex: 2 }}>
        <TextReveal
          text="Ready to transform your space?"
          tag="h2"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(32px, 5vw, 56px)",
            fontWeight: 300,
            color: "#FAFAFA",
            margin: "0 0 20px 0",
            lineHeight: 1.15,
          }}
        />
        <ScrollReveal delay={200}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: "40px" }}>
            Get a free consultation and detailed quote for your project. No obligation, no pressure — just honest advice on how to make your space exceptional.
          </p>
        </ScrollReveal>
        <ScrollReveal delay={350}>
          <MagneticButton>
            <span style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              color: "#1A1A1A",
              background: "#C8A96E",
              padding: "18px 48px",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              display: "inline-block",
              cursor: "pointer",
              fontWeight: 500,
            }}>
              Get Your Free Quote
            </span>
          </MagneticButton>
        </ScrollReveal>
      </div>
    </section>
  );
}

// ─── FOOTER ──────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: "#151515", padding: "60px 0 40px" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 clamp(20px, 4vw, 60px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "40px", marginBottom: "60px" }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", color: "#C8A96E", letterSpacing: "0.15em", marginBottom: "16px" }}>
              BRUSHLY
            </div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.35)", maxWidth: "280px", lineHeight: 1.6 }}>
              Premium painting & decorating for Surrey, Epsom, Reigate and surrounding areas.
            </p>
          </div>
          <div style={{ display: "flex", gap: "clamp(40px, 6vw, 100px)", flexWrap: "wrap" }}>
            {[
              { title: "Navigate", links: ["Services", "Gallery", "About", "Contact"] },
              { title: "Connect", links: ["Instagram", "Google Reviews", "Facebook"] },
            ].map((col) => (
              <div key={col.title}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "16px" }}>
                  {col.title}
                </div>
                {col.links.map((link) => (
                  <a key={link} href="#" style={{ display: "block", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "rgba(255,255,255,0.5)", textDecoration: "none", marginBottom: "10px" }}
                    onMouseEnter={(e) => e.target.style.color = "#C8A96E"}
                    onMouseLeave={(e) => e.target.style.color = "rgba(255,255,255,0.5)"}
                  >
                    {link}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "24px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.2)" }}>
            © 2026 Brushly UK. All rights reserved.
          </span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.2)" }}>
            Designed with precision.
          </span>
        </div>
      </div>
    </footer>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function BrushlyPrototype() {
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const { containerRef, scrollRef } = useSmoothScroll();

  useEffect(() => {
    // Monitor scroll position for header state
    const checkScroll = setInterval(() => {
      if (scrollRef.current) {
        setScrolled(scrollRef.current.current > 80);
      }
    }, 100);
    return () => clearInterval(checkScroll);
  }, []);

  return (
    <div style={{ background: "#1A1A1A", minHeight: "100vh", overflow: "hidden" }}>
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes scrollDown {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        ::selection { background: rgba(200, 169, 110, 0.3); color: #1A1A1A; }
        img { user-select: none; -webkit-user-drag: none; }
      `}</style>

      {loading && <PageLoader onComplete={() => setLoading(false)} />}

      {!loading && (
        <>
          <Header scrolled={scrolled} />
          <div ref={containerRef} style={{ willChange: "transform" }}>
            <HeroSection />
            <ServicesSection />
            <ShowcaseSection />
            <TestimonialSection />
            <CTASection />
            <Footer />
          </div>
        </>
      )}
    </div>
  );
}
