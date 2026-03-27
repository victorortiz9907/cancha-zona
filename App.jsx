import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "./supabaseClient";

const MUNICIPIOS = ["Todos", "Monterrey", "Apodaca", "Escobedo", "Guadalupe", "Juárez", "San Nicolás", "San Pedro", "Santa Catarina", "García"];

function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ============ ICONS ============ */
const StarIcon = ({ filled, half, size = 20, onClick, interactive }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" onClick={onClick} style={{ cursor: interactive ? "pointer" : "default", flexShrink: 0 }}>
    <defs><linearGradient id={`half-${size}`}><stop offset="50%" stopColor="#F59E0B" /><stop offset="50%" stopColor="transparent" /></linearGradient></defs>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      fill={filled ? "#F59E0B" : half ? `url(#half-${size})` : "none"} stroke="#F59E0B" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);
const Stars = ({ rating, size = 18 }) => {
  const full = Math.floor(rating); const hasHalf = rating - full >= 0.25 && rating - full < 0.75; const extraFull = rating - full >= 0.75;
  return (<div style={{ display: "flex", gap: 2, alignItems: "center" }}>{[0,1,2,3,4].map(i => (<StarIcon key={i} size={size} filled={i < full || (extraFull && i === full)} half={hasHalf && i === full} />))}<span style={{ marginLeft: 6, fontSize: 13, fontWeight: 500, color: "var(--cz-text-secondary)" }}>{rating > 0 ? rating.toFixed(1) : "Sin valorar"}</span></div>);
};
const InteractiveStars = ({ value, onChange }) => (<div style={{ display: "flex", gap: 4, alignItems: "center" }}>{[1,2,3,4,5].map(i => (<StarIcon key={i} size={28} filled={i <= value} interactive onClick={() => onChange(i)} />))}</div>);
const LocationIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>);
const SearchIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>);
const ChevronDown = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>);
const SunIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>);
const MoonIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>);
const PlusIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>);
const CloseIcon = ({ size = 20 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>);
const CameraIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>);
const ImageIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>);

/* ============ UI COMPONENTS ============ */
const Toast = ({ message, type = "success", onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  const bg = type === "success" ? "#059669" : type === "error" ? "#DC2626" : "#D97706";
  return (<div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: bg, color: "#fff", padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 500, zIndex: 9999, boxShadow: "0 8px 32px rgba(0,0,0,0.3)", animation: "slideUp 0.3s ease-out" }}>{message}</div>);
};
const Modal = ({ open, onClose, title, children, wide }) => {
  if (!open) return null;
  return (<div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", padding: 16, animation: "fadeIn 0.2s ease-out" }} onClick={onClose}>
    <div onClick={e => e.stopPropagation()} style={{ background: "var(--cz-bg)", borderRadius: 16, width: "100%", maxWidth: wide ? 700 : 480, maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--cz-border)" }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: "var(--cz-text)" }}>{title}</h2>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--cz-text-secondary)", padding: 4 }}><CloseIcon /></button>
      </div>
      <div style={{ padding: 24 }}>{children}</div>
    </div>
  </div>);
};
const Input = ({ label, ...props }) => (<div style={{ marginBottom: 16 }}>{label && <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--cz-text-secondary)" }}>{label}</label>}<input {...props} style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--cz-border)", borderRadius: 10, fontSize: 14, background: "var(--cz-bg-secondary)", color: "var(--cz-text)", outline: "none", boxSizing: "border-box", ...props.style }} /></div>);
const Textarea = ({ label, ...props }) => (<div style={{ marginBottom: 16 }}>{label && <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--cz-text-secondary)" }}>{label}</label>}<textarea {...props} style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--cz-border)", borderRadius: 10, fontSize: 14, background: "var(--cz-bg-secondary)", color: "var(--cz-text)", outline: "none", boxSizing: "border-box", resize: "vertical", minHeight: 80, fontFamily: "inherit", ...props.style }} /></div>);
const Button = ({ children, variant = "primary", ...props }) => {
  const styles = { primary: { background: "linear-gradient(135deg, #10B981, #059669)", color: "#fff", border: "none", boxShadow: "0 4px 14px rgba(16,185,129,0.4)" }, secondary: { background: "var(--cz-bg-secondary)", color: "var(--cz-text)", border: "1.5px solid var(--cz-border)" }, danger: { background: "#DC2626", color: "#fff", border: "none" }, ghost: { background: "transparent", color: "var(--cz-text)", border: "none" } };
  return (<button {...props} style={{ padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: props.disabled ? "not-allowed" : "pointer", opacity: props.disabled ? 0.5 : 1, transition: "all 0.2s", fontFamily: "inherit", ...styles[variant], ...props.style }}>{children}</button>);
};

/* ============ CANCHA CARD ============ */
const CanchaCard = ({ cancha, userLat, userLng, avgRating, reviewCount, onRate, onView }) => {
  const [imgIdx, setImgIdx] = useState(0);
  const dist = userLat ? calcDistance(userLat, userLng, cancha.lat, cancha.lng) : null;
  const fotos = cancha.fotos && cancha.fotos.length > 0 ? cancha.fotos : [""];
  return (
    <div style={{ background: "var(--cz-bg)", borderRadius: 16, overflow: "hidden", border: "1px solid var(--cz-border)", transition: "transform 0.2s, box-shadow 0.2s", cursor: "pointer" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.12)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
      onClick={() => onView(cancha)}>
      <div style={{ position: "relative", paddingTop: "56%", background: "#1a1a1a" }}>
        <img src={fotos[imgIdx]} alt={cancha.nombre} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          onError={e => { e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23334155' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%2394a3b8' font-size='16'%3ECancha%3C/text%3E%3C/svg%3E"; }} />
        <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4 }}>
          {fotos.map((_, i) => (<button key={i} onClick={e => { e.stopPropagation(); setImgIdx(i); }} style={{ width: i === imgIdx ? 20 : 8, height: 8, borderRadius: 4, background: i === imgIdx ? "#10B981" : "rgba(255,255,255,0.5)", border: "none", cursor: "pointer", transition: "all 0.2s", padding: 0 }} />))}
        </div>
        {dist !== null && (<div style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.7)", color: "#fff", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, backdropFilter: "blur(4px)" }}><LocationIcon /> {dist.toFixed(1)} km</div>)}
      </div>
      <div style={{ padding: "16px 18px" }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 4px", color: "var(--cz-text)" }}>{cancha.nombre}</h3>
        <p style={{ fontSize: 13, color: "var(--cz-text-tertiary)", margin: "0 0 8px", display: "flex", alignItems: "center", gap: 4 }}><LocationIcon /> {cancha.municipio}</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Stars rating={avgRating} size={16} />
          <span style={{ fontSize: 12, color: "var(--cz-text-tertiary)" }}>{reviewCount} {reviewCount === 1 ? "opinión" : "opiniones"}</span>
        </div>
        <button onClick={e => { e.stopPropagation(); onRate(cancha); }}
          style={{ marginTop: 12, width: "100%", padding: "8px 0", border: "1.5px solid #10B981", borderRadius: 8, background: "transparent", color: "#10B981", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit" }}
          onMouseEnter={e => { e.target.style.background = "#10B981"; e.target.style.color = "#fff"; }}
          onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "#10B981"; }}>
          Calificar
        </button>
      </div>
    </div>
  );
};

/* ============ CANCHA DETAIL ============ */
const CanchaDetail = ({ cancha, avgRating, reviewCount, reviews, profiles, onRate }) => {
  const [imgIdx, setImgIdx] = useState(0);
  const fotos = cancha.fotos && cancha.fotos.length > 0 ? cancha.fotos : [""];
  return (<div>
    <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
      <img src={fotos[imgIdx]} alt="" style={{ width: "100%", height: 280, objectFit: "cover" }} />
      <div style={{ display: "flex", gap: 6, padding: "12px 0", justifyContent: "center" }}>
        {fotos.map((f, i) => (<img key={i} src={f} alt="" onClick={() => setImgIdx(i)} style={{ width: 56, height: 40, objectFit: "cover", borderRadius: 6, cursor: "pointer", border: i === imgIdx ? "2px solid #10B981" : "2px solid transparent", opacity: i === imgIdx ? 1 : 0.6 }} />))}
      </div>
    </div>
    <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px", color: "var(--cz-text)" }}>{cancha.nombre}</h2>
    <p style={{ fontSize: 14, color: "var(--cz-text-tertiary)", margin: "0 0 8px", display: "flex", alignItems: "center", gap: 4 }}><LocationIcon /> {cancha.direccion}</p>
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}><Stars rating={avgRating} size={20} /><span style={{ fontSize: 13, color: "var(--cz-text-tertiary)" }}>({reviewCount})</span></div>
    <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--cz-text-secondary)", margin: "0 0 20px" }}>{cancha.descripcion}</p>
    <Button onClick={() => onRate(cancha)} style={{ width: "100%", marginBottom: 20 }}>Calificar esta cancha</Button>
    {reviews.length > 0 && (<div>
      <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px", color: "var(--cz-text)" }}>Opiniones ({reviews.length})</h3>
      {reviews.map(r => {
        const p = profiles.find(p => p.id === r.user_id);
        return (<div key={r.id} style={{ padding: "12px 0", borderTop: "1px solid var(--cz-border)", display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#10B981", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
            {p ? (p.nombre[0] + p.apellido[0]).toUpperCase() : "?"}
          </div>
          <div><p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "var(--cz-text)" }}>{p ? `${p.nombre} ${p.apellido}` : "Usuario"}</p><Stars rating={r.estrellas} size={14} /></div>
        </div>);
      })}
    </div>)}
  </div>);
};

/* ============ ADMIN PANEL ============ */
const AdminPanel = ({ onBack }) => {
  const [tab, setTab] = useState("sugerencias");
  const [sugerencias, setSugerencias] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [canchas, setCanchas] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [s, r, c, p] = await Promise.all([
        supabase.from("sugerencias").select("*").order("created_at", { ascending: false }),
        supabase.from("reviews").select("*"),
        supabase.from("canchas").select("*"),
        supabase.from("profiles").select("*"),
      ]);
      setSugerencias(s.data || []);
      setReviews(r.data || []);
      setCanchas(c.data || []);
      setProfiles(p.data || []);
      setLoading(false);
    }
    load();
  }, []);

  const aprobar = async (sug) => {
    const { error: insertErr } = await supabase.from("canchas").insert({
      nombre: sug.nombre, direccion: sug.direccion, descripcion: sug.descripcion,
      municipio: sug.municipio, lat: sug.lat || 25.68 + (Math.random() - 0.5) * 0.1,
      lng: sug.lng || -100.31 + (Math.random() - 0.5) * 0.1, fotos: sug.fotos || [], estatus: "aprobada"
    });
    if (!insertErr) {
      await supabase.from("sugerencias").update({ estatus: "aprobada" }).eq("id", sug.id);
      setSugerencias(prev => prev.map(s => s.id === sug.id ? { ...s, estatus: "aprobada" } : s));
    }
  };

  const rechazar = async (id) => {
    await supabase.from("sugerencias").update({ estatus: "rechazada" }).eq("id", id);
    setSugerencias(prev => prev.map(s => s.id === id ? { ...s, estatus: "rechazada" } : s));
  };

  const updateReview = async (reviewId, estrellas) => {
    await supabase.from("reviews").update({ estrellas }).eq("id", reviewId);
    setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, estrellas } : r));
  };

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: "var(--cz-text-secondary)" }}>Cargando...</div>;

  return (<div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
    <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 24px", color: "var(--cz-text)" }}>Panel de administración</h1>
    <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
      {["sugerencias", "reviews"].map(t => (<button key={t} onClick={() => setTab(t)} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", background: tab === t ? "#10B981" : "var(--cz-bg-secondary)", color: tab === t ? "#fff" : "var(--cz-text-secondary)" }}>{t === "sugerencias" ? "Sugerencias" : "Moderación de estrellas"}</button>))}
    </div>
    {tab === "sugerencias" && (<div>
      {sugerencias.length === 0 && <p style={{ color: "var(--cz-text-tertiary)", textAlign: "center", padding: 40 }}>No hay sugerencias</p>}
      {sugerencias.map(s => (<div key={s.id} style={{ background: "var(--cz-bg)", border: "1px solid var(--cz-border)", borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div><h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600, color: "var(--cz-text)" }}>{s.nombre}</h3><p style={{ margin: 0, fontSize: 13, color: "var(--cz-text-secondary)" }}>{s.direccion}</p></div>
          <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: s.estatus === "aprobada" ? "#D1FAE5" : s.estatus === "rechazada" ? "#FEE2E2" : "#FEF3C7", color: s.estatus === "aprobada" ? "#065F46" : s.estatus === "rechazada" ? "#991B1B" : "#92400E" }}>{s.estatus}</span>
        </div>
        <p style={{ fontSize: 14, color: "var(--cz-text-secondary)", margin: "12px 0" }}>{s.descripcion}</p>
        {s.fotos && s.fotos.length > 0 && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>{s.fotos.map((f, i) => (<img key={i} src={f} alt="" style={{ width: 100, height: 70, objectFit: "cover", borderRadius: 8 }} onError={e => { e.target.style.display = "none"; }} />))}</div>}
        {s.estatus === "pendiente" && (<div style={{ display: "flex", gap: 8 }}><Button onClick={() => aprobar(s)} style={{ fontSize: 13 }}>Aprobar</Button><Button variant="danger" onClick={() => rechazar(s.id)} style={{ fontSize: 13 }}>Rechazar</Button></div>)}
      </div>))}
    </div>)}
    {tab === "reviews" && (<div>
      {reviews.length === 0 && <p style={{ color: "var(--cz-text-tertiary)", textAlign: "center", padding: 40 }}>No hay valoraciones</p>}
      {reviews.map(r => {
        const cancha = canchas.find(c => c.id === r.cancha_id);
        const profile = profiles.find(p => p.id === r.user_id);
        return (<div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--cz-bg)", border: "1px solid var(--cz-border)", borderRadius: 10, marginBottom: 8 }}>
          <div><span style={{ fontSize: 14, fontWeight: 600, color: "var(--cz-text)" }}>{profile ? `${profile.nombre} ${profile.apellido}` : "Usuario"}</span><span style={{ fontSize: 13, color: "var(--cz-text-tertiary)" }}>{" → "}{cancha ? cancha.nombre : "Cancha"}</span></div>
          <select value={r.estrellas} onChange={e => updateReview(r.id, Number(e.target.value))} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--cz-border)", background: "var(--cz-bg-secondary)", color: "var(--cz-text)", fontSize: 14 }}>
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} estrella{n > 1 ? "s" : ""}</option>)}
          </select>
        </div>);
      })}
    </div>)}
  </div>);
};

/* ============ MAIN APP ============ */
export default function App() {
  const [dark, setDark] = useState(false);
  const [page, setPage] = useState(window.location.pathname === "/admin" ? "admin" : "home");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [canchas, setCanchas] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [search, setSearch] = useState("");
  const [filtroMunicipio, setFiltroMunicipio] = useState("Todos");
  const [filtroEstrellas, setFiltroEstrellas] = useState(0);
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showSugerencia, setShowSugerencia] = useState(false);
  const [showRate, setShowRate] = useState(null);
  const [showDetail, setShowDetail] = useState(null);
  const [rateValue, setRateValue] = useState(0);
  const [toast, setToast] = useState(null);
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [regForm, setRegForm] = useState({ nombre: "", apellido: "", email: "", password: "", foto: null });
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [sugForm, setSugForm] = useState({ nombre: "", direccion: "", municipio: "Monterrey", descripcion: "", fotos: [] });
  const [loading, setLoading] = useState(true);
  const fileRef = useRef(null);
  const sugFileRef = useRef(null);

  // Load data from Supabase
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data: prof } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
        if (prof) setProfile(prof);
      }
      const [c, r, p] = await Promise.all([
        supabase.from("canchas").select("*").eq("estatus", "aprobada"),
        supabase.from("reviews").select("*"),
        supabase.from("profiles").select("*"),
      ]);
      setCanchas(c.data || []);
      setReviews(r.data || []);
      setProfiles(p.data || []);
      setLoading(false);
    }
    init();
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        const { data: prof } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
        if (prof) setProfile(prof);
      } else {
        setUser(null);
        setProfile(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); },
        () => { setUserLat(25.6866); setUserLng(-100.3161); }
      );
    } else { setUserLat(25.6866); setUserLng(-100.3161); }
  }, []);

  const getAvgRating = useCallback((canchaId) => {
    const rs = reviews.filter(r => r.cancha_id === canchaId);
    if (rs.length === 0) return 0;
    return rs.reduce((sum, r) => sum + r.estrellas, 0) / rs.length;
  }, [reviews]);

  const getReviewCount = useCallback((canchaId) => reviews.filter(r => r.cancha_id === canchaId).length, [reviews]);

  const filteredCanchas = useMemo(() => {
    return canchas
      .filter(c => !search || c.nombre.toLowerCase().includes(search.toLowerCase()))
      .filter(c => filtroMunicipio === "Todos" || c.municipio === filtroMunicipio)
      .filter(c => filtroEstrellas === 0 || getAvgRating(c.id) >= filtroEstrellas)
      .sort((a, b) => { if (!userLat) return 0; return calcDistance(userLat, userLng, a.lat, a.lng) - calcDistance(userLat, userLng, b.lat, b.lng); });
  }, [canchas, search, filtroMunicipio, filtroEstrellas, userLat, userLng, getAvgRating]);

  // AUTH HANDLERS
  const handleRegister = async () => {
    if (!regForm.nombre || !regForm.apellido || !regForm.email || !regForm.password) { setToast({ message: "Completa todos los campos", type: "error" }); return; }
    const { data, error } = await supabase.auth.signUp({ email: regForm.email, password: regForm.password });
    if (error) { setToast({ message: error.message, type: "error" }); return; }
    if (data.user) {
      let fotoUrl = null;
      if (regForm.foto) {
        const file = regForm.fotoFile;
        if (file) {
          const ext = file.name.split('.').pop();
          const path = `avatars/${data.user.id}.${ext}`;
          const { error: uploadErr } = await supabase.storage.from("fotos").upload(path, file, { upsert: true });
          if (!uploadErr) { const { data: urlData } = supabase.storage.from("fotos").getPublicUrl(path); fotoUrl = urlData.publicUrl; }
        }
      }
      await supabase.from("profiles").insert({ id: data.user.id, nombre: regForm.nombre, apellido: regForm.apellido, foto_url: fotoUrl });
      setProfile({ id: data.user.id, nombre: regForm.nombre, apellido: regForm.apellido, foto_url: fotoUrl });
      setProfiles(prev => [...prev, { id: data.user.id, nombre: regForm.nombre, apellido: regForm.apellido, foto_url: fotoUrl }]);
    }
    setShowRegister(false);
    setRegForm({ nombre: "", apellido: "", email: "", password: "", foto: null, fotoFile: null });
    setToast({ message: "Bienvenido a Cancha Zona", type: "success" });
  };

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email: loginForm.email, password: loginForm.password });
    if (error) { setToast({ message: "Credenciales incorrectas", type: "error" }); return; }
    setShowLogin(false);
    setLoginForm({ email: "", password: "" });
    setToast({ message: "Sesión iniciada", type: "success" });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null); setProfile(null);
    setToast({ message: "Sesión cerrada", type: "success" });
  };

  // RATE HANDLER (upsert)
  const handleRate = async () => {
    if (!user) { setShowRate(null); setShowRegister(true); return; }
    if (rateValue === 0) { setToast({ message: "Selecciona al menos 1 estrella", type: "error" }); return; }
    const existing = reviews.find(r => r.user_id === user.id && r.cancha_id === showRate.id);
    if (existing) {
      await supabase.from("reviews").update({ estrellas: rateValue }).eq("id", existing.id);
      setReviews(prev => prev.map(r => r.id === existing.id ? { ...r, estrellas: rateValue } : r));
      setToast({ message: "Valoración actualizada", type: "success" });
    } else {
      const { data, error } = await supabase.from("reviews").insert({ user_id: user.id, cancha_id: showRate.id, estrellas: rateValue }).select().single();
      if (!error && data) { setReviews(prev => [...prev, data]); setToast({ message: "Gracias por tu valoración", type: "success" }); }
      else { setToast({ message: "Error al guardar", type: "error" }); }
    }
    setShowRate(null); setRateValue(0);
  };

  // SUGGESTION HANDLER
  const handleSugerencia = async () => {
    if (!user) { setShowSugerencia(false); setShowRegister(true); return; }
    if (!sugForm.nombre || !sugForm.direccion || !sugForm.descripcion) { setToast({ message: "Completa todos los campos", type: "error" }); return; }
    let fotoUrls = [];
    if (sugForm.fotoFiles && sugForm.fotoFiles.length > 0) {
      for (const file of sugForm.fotoFiles) {
        const ext = file.name.split('.').pop();
        const path = `sugerencias/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("fotos").upload(path, file);
        if (!error) { const { data: urlData } = supabase.storage.from("fotos").getPublicUrl(path); fotoUrls.push(urlData.publicUrl); }
      }
    }
    await supabase.from("sugerencias").insert({ user_id: user.id, nombre: sugForm.nombre, direccion: sugForm.direccion, municipio: sugForm.municipio, descripcion: sugForm.descripcion, fotos: fotoUrls, estatus: "pendiente" });
    setShowSugerencia(false);
    setSugForm({ nombre: "", direccion: "", municipio: "Monterrey", descripcion: "", fotos: [], fotoFiles: null });
    setToast({ message: "Sugerencia enviada. Será revisada por el admin.", type: "success" });
  };

  const handleProfilePhoto = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setRegForm(prev => ({ ...prev, foto: reader.result, fotoFile: file }));
      reader.readAsDataURL(file);
    }
  };

  const handleSugPhotos = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 4);
    setSugForm(prev => ({ ...prev, fotoFiles: files }));
    const promises = files.map(f => new Promise(resolve => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(f); }));
    Promise.all(promises).then(results => setSugForm(prev => ({ ...prev, fotos: results })));
  };

  const cssVars = dark ? { "--cz-bg": "#0F172A", "--cz-bg-secondary": "#1E293B", "--cz-text": "#F1F5F9", "--cz-text-secondary": "#94A3B8", "--cz-text-tertiary": "#64748B", "--cz-border": "#334155" }
    : { "--cz-bg": "#FFFFFF", "--cz-bg-secondary": "#F8FAFC", "--cz-text": "#0F172A", "--cz-text-secondary": "#475569", "--cz-text-tertiary": "#94A3B8", "--cz-border": "#E2E8F0" };

  // ADMIN PAGE
  if (page === "admin") {
    if (!adminAuth) {
      return (<div style={{ ...cssVars, background: "var(--cz-bg-secondary)", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{animCSS}</style>
        <div style={{ background: "var(--cz-bg)", padding: 32, borderRadius: 16, border: "1px solid var(--cz-border)", width: "100%", maxWidth: 400 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 20px", textAlign: "center", color: "var(--cz-text)" }}>Admin Login</h2>
          <Input label="Usuario" value={adminUser} onChange={e => setAdminUser(e.target.value)} />
          <Input label="Contraseña" type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} />
          <Button onClick={() => { if (adminUser === "admincanchazona" && adminPass === "CanchaZ0na#2026") setAdminAuth(true); else setToast({ message: "Credenciales incorrectas", type: "error" }); }} style={{ width: "100%" }}>Entrar</Button>
          <button onClick={() => { setPage("home"); window.history.pushState({}, "", "/"); }} style={{ display: "block", margin: "16px auto 0", background: "none", border: "none", color: "#10B981", cursor: "pointer", fontSize: 14 }}>Volver al inicio</button>
        </div>
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>);
    }
    return (<div style={{ ...cssVars, background: "var(--cz-bg-secondary)", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{animCSS}</style>
      <div style={{ background: "var(--cz-bg)", borderBottom: "1px solid var(--cz-border)", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 22 }}>⚽</span><span style={{ fontSize: 18, fontWeight: 800, color: "#10B981" }}>Cancha Zona</span><span style={{ fontSize: 12, background: "#FEF3C7", color: "#92400E", padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>Admin</span></div>
        <div style={{ display: "flex", gap: 8 }}><Button variant="secondary" onClick={() => { setPage("home"); window.history.pushState({}, "", "/"); }} style={{ fontSize: 13 }}>Ir al sitio</Button><Button variant="danger" onClick={() => { setAdminAuth(false); setPage("home"); window.history.pushState({}, "", "/"); }} style={{ fontSize: 13 }}>Salir</Button></div>
      </div>
      <AdminPanel onBack={() => setPage("home")} />
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>);
  }

  if (loading) return (<div style={{ ...cssVars, background: "var(--cz-bg-secondary)", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}><style>{animCSS}</style><p style={{ color: "var(--cz-text-secondary)", fontSize: 16 }}>Cargando Cancha Zona...</p></div>);

  // MAIN PAGE
  return (<div style={{ ...cssVars, background: "var(--cz-bg-secondary)", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
    <style>{animCSS}</style>
    {/* HEADER */}
    <header style={{ background: "var(--cz-bg)", borderBottom: "1px solid var(--cz-border)", padding: "0 20px", position: "sticky", top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setPage("home")}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg, #10B981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#fff" }}>⚽</div>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}><span style={{ color: "#10B981" }}>Cancha</span><span style={{ color: "var(--cz-text)" }}> Zona</span></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setDark(!dark)} style={{ width: 40, height: 40, borderRadius: 10, border: "1.5px solid var(--cz-border)", background: "var(--cz-bg-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cz-text-secondary)" }}>{dark ? <SunIcon /> : <MoonIcon />}</button>
          {user && profile ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", background: "#10B981", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 700, border: "2px solid var(--cz-border)" }}>
                {profile.foto_url ? <img src={profile.foto_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (profile.nombre[0] + profile.apellido[0]).toUpperCase()}
              </div>
              <button onClick={handleLogout} style={{ background: "none", border: "1.5px solid var(--cz-border)", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--cz-text-secondary)", fontFamily: "inherit" }}>Cerrar sesión</button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="ghost" onClick={() => setShowLogin(true)} style={{ fontSize: 13, padding: "8px 16px" }}>Iniciar sesión</Button>
              <Button onClick={() => setShowRegister(true)} style={{ fontSize: 13, padding: "8px 16px" }}>Registrarse</Button>
            </div>
          )}
        </div>
      </div>
    </header>
    {/* HERO */}
    <section style={{ background: dark ? "linear-gradient(180deg, #0F172A 0%, #064E3B 100%)" : "linear-gradient(180deg, #ECFDF5 0%, #D1FAE5 100%)", padding: "48px 20px 40px", textAlign: "center" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 8px", color: "var(--cz-text)", letterSpacing: -0.5 }}>Encuentra tu cancha ideal</h1>
      <p style={{ fontSize: 16, color: "var(--cz-text-secondary)", margin: "0 0 28px" }}>El directorio #1 de canchas de fútbol en Monterrey y su zona metropolitana</p>
      <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <div style={{ flex: "1 1 280px", position: "relative", maxWidth: 400 }}>
          <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--cz-text-tertiary)" }}><SearchIcon /></div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cancha..." style={{ width: "100%", padding: "12px 14px 12px 42px", border: "1.5px solid var(--cz-border)", borderRadius: 12, fontSize: 14, background: "var(--cz-bg)", color: "var(--cz-text)", boxSizing: "border-box", outline: "none" }} />
        </div>
        <div style={{ position: "relative" }}>
          <select value={filtroMunicipio} onChange={e => setFiltroMunicipio(e.target.value)} style={{ padding: "12px 36px 12px 14px", border: "1.5px solid var(--cz-border)", borderRadius: 12, fontSize: 14, background: "var(--cz-bg)", color: "var(--cz-text)", appearance: "none", cursor: "pointer", outline: "none", minWidth: 150 }}>{MUNICIPIOS.map(m => <option key={m} value={m}>{m}</option>)}</select>
          <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--cz-text-tertiary)" }}><ChevronDown /></div>
        </div>
        <div style={{ position: "relative" }}>
          <select value={filtroEstrellas} onChange={e => setFiltroEstrellas(Number(e.target.value))} style={{ padding: "12px 36px 12px 14px", border: "1.5px solid var(--cz-border)", borderRadius: 12, fontSize: 14, background: "var(--cz-bg)", color: "var(--cz-text)", appearance: "none", cursor: "pointer", outline: "none", minWidth: 150 }}>
            <option value={0}>Todas las estrellas</option>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n}+ estrellas</option>)}
          </select>
          <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--cz-text-tertiary)" }}><ChevronDown /></div>
        </div>
      </div>
    </section>
    {/* CONTENT */}
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <p style={{ fontSize: 14, color: "var(--cz-text-secondary)", margin: 0 }}>{filteredCanchas.length} cancha{filteredCanchas.length !== 1 ? "s" : ""} encontrada{filteredCanchas.length !== 1 ? "s" : ""}</p>
        <Button variant="secondary" onClick={() => { if (!user) { setShowRegister(true); return; } setShowSugerencia(true); }} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}><PlusIcon /> Sugerir cancha</Button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
        {filteredCanchas.map(c => (<CanchaCard key={c.id} cancha={c} userLat={userLat} userLng={userLng} avgRating={getAvgRating(c.id)} reviewCount={getReviewCount(c.id)}
          onRate={(cancha) => { if (!user) { setShowRegister(true); return; } const existing = reviews.find(r => r.user_id === user.id && r.cancha_id === cancha.id); setRateValue(existing ? existing.estrellas : 0); setShowRate(cancha); }}
          onView={setShowDetail} />))}
      </div>
      {filteredCanchas.length === 0 && (<div style={{ textAlign: "center", padding: "60px 20px" }}><p style={{ fontSize: 48, margin: "0 0 12px" }}>⚽</p><p style={{ fontSize: 16, fontWeight: 600, color: "var(--cz-text)", margin: "0 0 4px" }}>No se encontraron canchas</p><p style={{ fontSize: 14, color: "var(--cz-text-tertiary)" }}>Intenta con otros filtros o sugiere una nueva cancha</p></div>)}
    </main>
    {/* FOOTER */}
    <footer style={{ borderTop: "1px solid var(--cz-border)", padding: "24px 20px", textAlign: "center", color: "var(--cz-text-tertiary)", fontSize: 13 }}>
      <p style={{ margin: "0 0 4px" }}>Cancha Zona — Monterrey, NL, México</p>
      <button onClick={() => { setPage("admin"); window.history.pushState({}, "", "/admin"); }} style={{ background: "none", border: "none", color: "var(--cz-text-tertiary)", cursor: "pointer", fontSize: 12, textDecoration: "underline" }}>Administración</button>
    </footer>

    {/* ALL MODALS */}
    <Modal open={showLogin} onClose={() => setShowLogin(false)} title="Iniciar sesión">
      <Input label="Correo electrónico" type="email" value={loginForm.email} onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))} placeholder="tu@correo.com" />
      <Input label="Contraseña" type="password" value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} placeholder="Tu contraseña" />
      <Button onClick={handleLogin} style={{ width: "100%", marginBottom: 12 }}>Entrar</Button>
      <p style={{ textAlign: "center", fontSize: 13, color: "var(--cz-text-secondary)", margin: 0 }}>¿No tienes cuenta? <button onClick={() => { setShowLogin(false); setShowRegister(true); }} style={{ background: "none", border: "none", color: "#10B981", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Regístrate</button></p>
    </Modal>

    <Modal open={showRegister} onClose={() => setShowRegister(false)} title="Crear cuenta">
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div onClick={() => fileRef.current?.click()} style={{ width: 80, height: 80, borderRadius: "50%", margin: "0 auto", background: regForm.foto ? "none" : "var(--cz-bg-secondary)", border: "2px dashed var(--cz-border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {regForm.foto ? <img src={regForm.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <CameraIcon />}
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleProfilePhoto} />
        <p style={{ fontSize: 12, color: "var(--cz-text-tertiary)", marginTop: 6 }}>Foto de perfil (opcional)</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Input label="Nombre" value={regForm.nombre} onChange={e => setRegForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Juan" />
        <Input label="Apellido" value={regForm.apellido} onChange={e => setRegForm(p => ({ ...p, apellido: e.target.value }))} placeholder="Pérez" />
      </div>
      <Input label="Correo electrónico" type="email" value={regForm.email} onChange={e => setRegForm(p => ({ ...p, email: e.target.value }))} placeholder="tu@correo.com" />
      <Input label="Contraseña" type="password" value={regForm.password} onChange={e => setRegForm(p => ({ ...p, password: e.target.value }))} placeholder="Min. 6 caracteres" />
      <Button onClick={handleRegister} style={{ width: "100%", marginBottom: 12 }}>Crear cuenta</Button>
      <p style={{ textAlign: "center", fontSize: 13, color: "var(--cz-text-secondary)", margin: 0 }}>¿Ya tienes cuenta? <button onClick={() => { setShowRegister(false); setShowLogin(true); }} style={{ background: "none", border: "none", color: "#10B981", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Inicia sesión</button></p>
    </Modal>

    <Modal open={showSugerencia} onClose={() => setShowSugerencia(false)} title="Sugerir cancha" wide>
      <Input label="Nombre de la cancha" value={sugForm.nombre} onChange={e => setSugForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej. Canchas El Campeón" />
      <Input label="Dirección" value={sugForm.direccion} onChange={e => setSugForm(p => ({ ...p, direccion: e.target.value }))} placeholder="Calle, Colonia, Municipio" />
      <div style={{ marginBottom: 16 }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--cz-text-secondary)" }}>Municipio</label>
        <select value={sugForm.municipio} onChange={e => setSugForm(p => ({ ...p, municipio: e.target.value }))} style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--cz-border)", borderRadius: 10, fontSize: 14, background: "var(--cz-bg-secondary)", color: "var(--cz-text)", outline: "none" }}>{MUNICIPIOS.filter(m => m !== "Todos").map(m => <option key={m} value={m}>{m}</option>)}</select>
      </div>
      <Textarea label="Descripción" value={sugForm.descripcion} onChange={e => setSugForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Describe la cancha, servicios, etc." />
      <div style={{ marginBottom: 20 }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--cz-text-secondary)" }}>Fotos (hasta 4)</label>
        <div onClick={() => sugFileRef.current?.click()} style={{ border: "2px dashed var(--cz-border)", borderRadius: 12, padding: 24, textAlign: "center", cursor: "pointer", background: "var(--cz-bg-secondary)" }}><ImageIcon /><p style={{ fontSize: 13, color: "var(--cz-text-tertiary)", margin: "8px 0 0" }}>Click para seleccionar fotos</p></div>
        <input ref={sugFileRef} type="file" accept="image/*" multiple hidden onChange={handleSugPhotos} />
        {sugForm.fotos.length > 0 && <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>{sugForm.fotos.map((f, i) => (<img key={i} src={f} alt="" style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 8 }} />))}</div>}
      </div>
      <Button onClick={handleSugerencia} style={{ width: "100%" }}>Enviar sugerencia</Button>
    </Modal>

    <Modal open={!!showRate} onClose={() => { setShowRate(null); setRateValue(0); }} title={showRate ? `Calificar: ${showRate.nombre}` : ""}>
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <p style={{ fontSize: 15, color: "var(--cz-text-secondary)", margin: "0 0 16px" }}>¿Qué tal tu experiencia?</p>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}><InteractiveStars value={rateValue} onChange={setRateValue} /></div>
        <Button onClick={handleRate} style={{ width: "100%", maxWidth: 200 }}>{reviews.find(r => r.user_id === user?.id && r.cancha_id === showRate?.id) ? "Actualizar" : "Enviar"}</Button>
      </div>
    </Modal>

    <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title="" wide>
      {showDetail && <CanchaDetail cancha={showDetail} avgRating={getAvgRating(showDetail.id)} reviewCount={getReviewCount(showDetail.id)} reviews={reviews.filter(r => r.cancha_id === showDetail.id)} profiles={profiles}
        onRate={(cancha) => { if (!user) { setShowDetail(null); setShowRegister(true); return; } setShowDetail(null); const existing = reviews.find(r => r.user_id === user.id && r.cancha_id === cancha.id); setRateValue(existing ? existing.estrellas : 0); setShowRate(cancha); }} />}
    </Modal>

    {toast && <Toast {...toast} onClose={() => setToast(null)} />}
  </div>);
}

const animCSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&display=swap');
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
`;
