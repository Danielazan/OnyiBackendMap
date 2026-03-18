import { useState, useRef, useEffect } from "react";

const schema = {
  users: {
    color: "#3B82F6",
    x: 60, y: 300,
    fields: [
      { name: "id",            type: "UUID PK" },
      { name: "email",         type: "VARCHAR UNIQUE" },
      { name: "password_hash", type: "VARCHAR" },
      { name: "first_name",    type: "VARCHAR" },
      { name: "last_name",     type: "VARCHAR" },
      { name: "phone",         type: "VARCHAR" },
      { name: "role",          type: "ENUM(buyer,admin)" },
      { name: "is_verified",   type: "BOOLEAN" },
      { name: "created_at",    type: "TIMESTAMP" },
      { name: "updated_at",    type: "TIMESTAMP" },
    ],
  },
  user_sessions: {
    color: "#6366F1",
    x: 60, y: 700,
    fields: [
      { name: "id",                 type: "UUID PK" },
      { name: "user_id",            type: "UUID FK" },
      { name: "refresh_token_hash", type: "VARCHAR" },
      { name: "device_info",        type: "TEXT" },
      { name: "is_active",          type: "BOOLEAN" },
      { name: "expires_at",         type: "TIMESTAMP" },
      { name: "created_at",         type: "TIMESTAMP" },
    ],
  },
  user_addresses: {
    color: "#8B5CF6",
    x: 60, y: 1000,
    fields: [
      { name: "id",          type: "UUID PK" },
      { name: "user_id",     type: "UUID FK" },
      { name: "label",       type: "VARCHAR" },
      { name: "street",      type: "VARCHAR" },
      { name: "city",        type: "VARCHAR" },
      { name: "state",       type: "VARCHAR" },
      { name: "country",     type: "VARCHAR" },
      { name: "postal_code", type: "VARCHAR" },
      { name: "is_default",  type: "BOOLEAN" },
      { name: "created_at",  type: "TIMESTAMP" },
    ],
  },
  categories: {
    color: "#10B981",
    x: 500, y: 60,
    fields: [
      { name: "id",          type: "UUID PK" },
      { name: "parent_id",   type: "UUID FK (self)" },
      { name: "name",        type: "VARCHAR" },
      { name: "slug",        type: "VARCHAR UNIQUE" },
      { name: "description", type: "TEXT" },
      { name: "image_url",   type: "VARCHAR" },
      { name: "is_active",   type: "BOOLEAN" },
      { name: "sort_order",  type: "INTEGER" },
      { name: "created_at",  type: "TIMESTAMP" },
    ],
  },
  products: {
    color: "#F59E0B",
    x: 500, y: 400,
    fields: [
      { name: "id",            type: "UUID PK" },
      { name: "category_id",   type: "UUID FK" },
      { name: "name",          type: "VARCHAR" },
      { name: "slug",          type: "VARCHAR UNIQUE" },
      { name: "description",   type: "TEXT" },
      { name: "base_price",    type: "DECIMAL" },
      { name: "is_active",     type: "BOOLEAN" },
      { name: "search_vector", type: "TSVECTOR" },
      { name: "created_at",    type: "TIMESTAMP" },
      { name: "updated_at",    type: "TIMESTAMP" },
    ],
  },
  product_variants: {
    color: "#EF4444",
    x: 500, y: 780,
    fields: [
      { name: "id",             type: "UUID PK" },
      { name: "product_id",     type: "UUID FK" },
      { name: "name",           type: "VARCHAR" },
      { name: "sku",            type: "VARCHAR UNIQUE" },
      { name: "price",          type: "DECIMAL" },
      { name: "stock_quantity", type: "INTEGER" },
      { name: "attributes",     type: "JSONB" },
      { name: "is_active",      type: "BOOLEAN" },
      { name: "created_at",     type: "TIMESTAMP" },
    ],
  },
  variant_images: {
    color: "#EC4899",
    x: 500, y: 1080,
    fields: [
      { name: "id",            type: "UUID PK" },
      { name: "variant_id",    type: "UUID FK" },
      { name: "url_thumbnail", type: "VARCHAR" },
      { name: "url_medium",    type: "VARCHAR" },
      { name: "url_large",     type: "VARCHAR" },
      { name: "alt_text",      type: "VARCHAR" },
      { name: "sort_order",    type: "INTEGER" },
      { name: "created_at",    type: "TIMESTAMP" },
    ],
  },
  carts: {
    color: "#14B8A6",
    x: 960, y: 300,
    fields: [
      { name: "id",         type: "UUID PK" },
      { name: "user_id",    type: "UUID FK UNIQUE" },
      { name: "created_at", type: "TIMESTAMP" },
      { name: "updated_at", type: "TIMESTAMP" },
    ],
  },
  cart_items: {
    color: "#06B6D4",
    x: 960, y: 580,
    fields: [
      { name: "id",         type: "UUID PK" },
      { name: "cart_id",    type: "UUID FK" },
      { name: "variant_id", type: "UUID FK" },
      { name: "quantity",   type: "INTEGER" },
      { name: "added_at",   type: "TIMESTAMP" },
    ],
  },
  coupons: {
    color: "#F97316",
    x: 960, y: 820,
    fields: [
      { name: "id",               type: "UUID PK" },
      { name: "code",             type: "VARCHAR UNIQUE" },
      { name: "discount_type",    type: "ENUM(percent,fixed)" },
      { name: "discount_value",   type: "DECIMAL" },
      { name: "min_order_amount", type: "DECIMAL" },
      { name: "max_uses",         type: "INTEGER" },
      { name: "used_count",       type: "INTEGER" },
      { name: "expires_at",       type: "TIMESTAMP" },
      { name: "is_active",        type: "BOOLEAN" },
      { name: "created_at",       type: "TIMESTAMP" },
    ],
  },
  orders: {
    color: "#84CC16",
    x: 1400, y: 200,
    fields: [
      { name: "id",              type: "UUID PK" },
      { name: "user_id",         type: "UUID FK" },
      { name: "address_id",      type: "UUID FK" },
      { name: "coupon_id",       type: "UUID FK NULL" },
      { name: "status",          type: "ENUM" },
      { name: "subtotal",        type: "DECIMAL" },
      { name: "discount_amount", type: "DECIMAL" },
      { name: "total_amount",    type: "DECIMAL" },
      { name: "notes",           type: "TEXT" },
      { name: "created_at",      type: "TIMESTAMP" },
      { name: "updated_at",      type: "TIMESTAMP" },
    ],
  },
  order_items: {
    color: "#A3E635",
    x: 1400, y: 620,
    fields: [
      { name: "id",          type: "UUID PK" },
      { name: "order_id",    type: "UUID FK" },
      { name: "variant_id",  type: "UUID FK" },
      { name: "quantity",    type: "INTEGER" },
      { name: "unit_price",  type: "DECIMAL" },
      { name: "total_price", type: "DECIMAL" },
    ],
  },
  order_status_history: {
    color: "#D97706",
    x: 1400, y: 900,
    fields: [
      { name: "id",         type: "UUID PK" },
      { name: "order_id",   type: "UUID FK" },
      { name: "status",     type: "ENUM" },
      { name: "created_at", type: "TIMESTAMP" },
    ],
  },
  payment_transactions: {
    color: "#7C3AED",
    x: 1800, y: 400,
    fields: [
      { name: "id",             type: "UUID PK" },
      { name: "order_id",       type: "UUID FK" },
      { name: "provider",       type: "ENUM(stripe,paypal)" },
      { name: "provider_tx_id", type: "VARCHAR" },
      { name: "amount",         type: "DECIMAL" },
      { name: "currency",       type: "VARCHAR" },
      { name: "status",         type: "ENUM" },
      { name: "payload",        type: "JSONB" },
      { name: "created_at",     type: "TIMESTAMP" },
    ],
  },
  stock_reservations: {
    color: "#DC2626",
    x: 1800, y: 750,
    fields: [
      { name: "id",         type: "UUID PK" },
      { name: "order_id",   type: "UUID FK" },
      { name: "variant_id", type: "UUID FK" },
      { name: "quantity",   type: "INTEGER" },
      { name: "expires_at", type: "TIMESTAMP" },
      { name: "created_at", type: "TIMESTAMP" },
    ],
  },
  notifications: {
    color: "#0EA5E9",
    x: 1800, y: 60,
    fields: [
      { name: "id",         type: "UUID PK" },
      { name: "user_id",    type: "UUID FK" },
      { name: "type",       type: "VARCHAR" },
      { name: "title",      type: "VARCHAR" },
      { name: "message",    type: "TEXT" },
      { name: "is_read",    type: "BOOLEAN" },
      { name: "created_at", type: "TIMESTAMP" },
    ],
  },
};

const TABLE_WIDTH = 240;
const ROW_HEIGHT  = 22;
const HEADER_HEIGHT = 36;

function getTableHeight(table) {
  return HEADER_HEIGHT + table.fields.length * ROW_HEIGHT + 8;
}

const relationships = [
  { from: "users",            to: "user_sessions",        label: "1:N" },
  { from: "users",            to: "user_addresses",        label: "1:N" },
  { from: "users",            to: "carts",                 label: "1:1" },
  { from: "users",            to: "orders",                label: "1:N" },
  { from: "users",            to: "notifications",         label: "1:N" },
  { from: "categories",       to: "categories",            label: "self" },
  { from: "categories",       to: "products",              label: "1:N" },
  { from: "products",         to: "product_variants",      label: "1:N" },
  { from: "product_variants", to: "variant_images",        label: "1:N" },
  { from: "product_variants", to: "cart_items",            label: "1:N" },
  { from: "product_variants", to: "order_items",           label: "1:N" },
  { from: "product_variants", to: "stock_reservations",    label: "1:N" },
  { from: "carts",            to: "cart_items",            label: "1:N" },
  { from: "coupons",          to: "orders",                label: "1:N" },
  { from: "user_addresses",   to: "orders",                label: "1:N" },
  { from: "orders",           to: "order_items",           label: "1:N" },
  { from: "orders",           to: "order_status_history",  label: "1:N" },
  { from: "orders",           to: "payment_transactions",  label: "1:N" },
  { from: "orders",           to: "stock_reservations",    label: "1:N" },
];

function getTableCenter(name) {
  const t = schema[name];
  const h = getTableHeight(t);
  return { x: t.x + TABLE_WIDTH / 2, y: t.y + h / 2 };
}

function getEdgePoint(name, targetX, targetY) {
  const t = schema[name];
  const h = getTableHeight(t);
  const cx = t.x + TABLE_WIDTH / 2;
  const cy = t.y + h / 2;
  const dx = targetX - cx;
  const dy = targetY - cy;
  const angle = Math.atan2(dy, dx);
  const hw = TABLE_WIDTH / 2;
  const hh = h / 2;
  let ex, ey;
  if (Math.abs(Math.cos(angle)) * hh > Math.abs(Math.sin(angle)) * hw) {
    ex = cx + (dx > 0 ? hw : -hw);
    ey = cy + Math.tan(angle) * (dx > 0 ? hw : -hw);
  } else {
    ey = cy + (dy > 0 ? hh : -hh);
    ex = cx + (1 / Math.tan(angle)) * (dy > 0 ? hh : -hh);
  }
  return { x: ex, y: ey };
}

export default function ERDiagram() {
  const [selected,   setSelected]   = useState(null);
  const [hoveredRel, setHoveredRel] = useState(null);
  const [pan,        setPan]        = useState({ x: 0, y: 0 });
  const [scale,      setScale]      = useState(0.62);
  const [dragging,   setDragging]   = useState(false);
  const [dragStart,  setDragStart]  = useState(null);

  const svgRef = useRef(null);
  // Keep latest scale/pan in a ref so the wheel handler always sees current values
  const stateRef = useRef({ scale, pan });
  useEffect(() => { stateRef.current = { scale, pan }; }, [scale, pan]);

  // Register wheel as non-passive so preventDefault actually stops page scroll
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const { scale: s, pan: p } = stateRef.current;
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const factor   = e.deltaY > 0 ? 0.92 : 1.08;
      const newScale = Math.min(3, Math.max(0.15, s * factor));
      setPan({
        x: mouseX - (mouseX - p.x) * (newScale / s),
        y: mouseY - (mouseY - p.y) * (newScale / s),
      });
      setScale(newScale);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const handleMouseDown = (e) => {
    e.preventDefault(); // stop text selection fighting the drag
    setDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!dragging || !dragStart) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setDragging(false);
    setDragStart(null);
  };

  // ── relationship lines ────────────────────────────────────────────────────
  function renderRelationships() {
    return relationships.map((rel, i) => {
      // self-referential loop
      if (rel.from === rel.to) {
        const t = schema[rel.from];
        const x = t.x + TABLE_WIDTH;
        const y = t.y + 20;
        return (
          <g key={i}>
            <path
              d={`M${x},${y} C${x+50},${y-30} ${x+50},${y+60} ${x},${y+40}`}
              fill="none"
              stroke={schema[rel.from].color}
              strokeWidth={hoveredRel === i ? 2.5 : 1.5}
              strokeDasharray="5,3"
              opacity={0.7}
            />
            <text x={x+55} y={y+15} fill={schema[rel.from].color} fontSize="10" fontFamily="monospace">
              {rel.label}
            </text>
          </g>
        );
      }

      const tc  = getTableCenter(rel.from);
      const fc  = getTableCenter(rel.to);
      const ep1 = getEdgePoint(rel.from, fc.x, fc.y);
      const ep2 = getEdgePoint(rel.to,   tc.x, tc.y);
      const mx  = (ep1.x + ep2.x) / 2;
      const my  = (ep1.y + ep2.y) / 2;
      const isActive = selected === rel.from || selected === rel.to || hoveredRel === i;

      return (
        <g
          key={i}
          onMouseEnter={() => setHoveredRel(i)}
          onMouseLeave={() => setHoveredRel(null)}
        >
          <path
            d={`M${ep1.x},${ep1.y} Q${mx+(ep2.y-ep1.y)*0.15},${my-(ep2.x-ep1.x)*0.15} ${ep2.x},${ep2.y}`}
            fill="none"
            stroke={isActive ? schema[rel.from].color : "#334155"}
            strokeWidth={isActive ? 2 : 1}
            opacity={isActive ? 1 : 0.4}
            strokeDasharray={isActive ? "none" : "4,3"}
          />
          <circle cx={ep1.x} cy={ep1.y} r={3} fill={schema[rel.from].color} opacity={isActive ? 1 : 0.4} />
          <circle cx={ep2.x} cy={ep2.y} r={3} fill={schema[rel.to].color}   opacity={isActive ? 1 : 0.4} />
          {hoveredRel === i && (
            <text
              x={mx} y={my - 8}
              textAnchor="middle"
              fill="white"
              fontSize="10"
              fontFamily="monospace"
              style={{ filter: "drop-shadow(0 0 4px #000)" }}
            >
              {rel.label}
            </text>
          )}
        </g>
      );
    });
  }

  // ── table boxes ───────────────────────────────────────────────────────────
  function renderTable(name) {
    const table = schema[name];
    const h = getTableHeight(table);
    const isSelected = selected === name;
    return (
      <g
        key={name}
        transform={`translate(${table.x}, ${table.y})`}
        onClick={(e) => { e.stopPropagation(); setSelected(selected === name ? null : name); }}
        style={{ cursor: "pointer" }}
      >
        {/* card body */}
        <rect
          width={TABLE_WIDTH} height={h} rx={8}
          fill="#0F172A"
          stroke={isSelected ? table.color : "#1E293B"}
          strokeWidth={isSelected ? 2.5 : 1}
          style={{ filter: isSelected ? `drop-shadow(0 0 12px ${table.color}88)` : "none" }}
        />
        {/* header fill */}
        <rect width={TABLE_WIDTH} height={HEADER_HEIGHT} rx={8} fill={table.color} />
        <rect y={HEADER_HEIGHT - 8} width={TABLE_WIDTH} height={8} fill={table.color} />
        {/* header label */}
        <text
          x={TABLE_WIDTH / 2} y={HEADER_HEIGHT / 2 + 5}
          textAnchor="middle"
          fill="white" fontSize="12" fontWeight="bold" fontFamily="'Courier New', monospace"
        >
          {name}
        </text>
        {/* field rows */}
        {table.fields.map((field, fi) => {
          const fy   = HEADER_HEIGHT + 6 + fi * ROW_HEIGHT;
          const isPK = field.type.includes("PK");
          const isFK = field.type.includes("FK");
          return (
            <g key={fi}>
              <rect
                x={1} y={fy - 1} width={TABLE_WIDTH - 2} height={ROW_HEIGHT - 1}
                fill={fi % 2 === 0 ? "#0F172A" : "#111827"}
              />
              <text
                x={10} y={fy + 13}
                fill={isPK ? "#FCD34D" : isFK ? "#86EFAC" : "#94A3B8"}
                fontSize="10" fontFamily="'Courier New', monospace"
              >
                {isPK ? "🔑 " : isFK ? "🔗 " : "   "}{field.name}
              </text>
              <text
                x={TABLE_WIDTH - 8} y={fy + 13}
                textAnchor="end"
                fill={isPK ? "#FCD34D44" : isFK ? "#86EFAC44" : "#47556944"}
                fontSize="9" fontFamily="'Courier New', monospace"
              >
                {field.type
                  .replace(" PK",   "")
                  .replace(" FK",   "")
                  .replace(" NULL", "")
                  .replace(" UNIQUE","")
                  .replace(" (self)","")
                }
              </text>
            </g>
          );
        })}
      </g>
    );
  }

  // ── side panel data ───────────────────────────────────────────────────────
  const selectedTable  = selected ? schema[selected] : null;
  const relatedTables  = selected
    ? relationships
        .filter(r => r.from === selected || r.to === selected)
        .map(r => ({
          table:     r.from === selected ? r.to   : r.from,
          label:     r.label,
          direction: r.from === selected ? "→"    : "←",
        }))
    : [];

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      width: "100vw", height: "100vh",
      background: "#020617", overflow: "hidden",
      fontFamily: "'Courier New', monospace", position: "relative",
    }}>

      {/* ── top bar ── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
        padding: "12px 20px",
        background: "linear-gradient(180deg,#020617 70%,transparent)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ color: "#38BDF8", fontSize: 13, letterSpacing: 3, textTransform: "uppercase", marginBottom: 2 }}>
            E-Commerce Platform
          </div>
          <div style={{ color: "white", fontSize: 20, fontWeight: "bold" }}>
            Database Schema · ER Diagram
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ color: "#334155", fontSize: 10, marginRight: 4 }}>
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => {
              const newScale = Math.min(3, scale + 0.1);
              setScale(newScale);
            }}
            style={{ background: "#1E293B", border: "1px solid #334155", color: "white", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 16 }}
          >+</button>
          <button
            onClick={() => {
              const newScale = Math.max(0.15, scale - 0.1);
              setScale(newScale);
            }}
            style={{ background: "#1E293B", border: "1px solid #334155", color: "white", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 16 }}
          >−</button>
          <button
            onClick={() => { setScale(0.62); setPan({ x: 0, y: 0 }); setSelected(null); }}
            style={{ background: "#1E293B", border: "1px solid #334155", color: "#94A3B8", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 11 }}
          >RESET</button>
        </div>
      </div>

      {/* ── legend / table list ── */}
      <div style={{
        position: "absolute", bottom: 16, left: 16, zIndex: 10,
        background: "#0F172A", border: "1px solid #1E293B",
        borderRadius: 8, padding: "10px 14px", maxHeight: "55vh", overflowY: "auto",
      }}>
        <div style={{ color: "#64748B", fontSize: 10, marginBottom: 6, letterSpacing: 2 }}>LEGEND</div>
        {[
          ["#FCD34D", "🔑 Primary Key"],
          ["#86EFAC", "🔗 Foreign Key"],
          ["#94A3B8", "   Field"],
        ].map(([col, label]) => (
          <div key={label} style={{ color: col, fontSize: 10, marginBottom: 3 }}>{label}</div>
        ))}

        <div style={{ marginTop: 8, borderTop: "1px solid #1E293B", paddingTop: 8 }}>
          <div style={{ color: "#64748B", fontSize: 10, marginBottom: 6, letterSpacing: 2 }}>
            TABLES ({Object.keys(schema).length})
          </div>
          {Object.entries(schema).map(([name, t]) => (
            <div
              key={name}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                marginBottom: 3, cursor: "pointer",
              }}
              onClick={() => setSelected(selected === name ? null : name)}
            >
              <div style={{ width: 8, height: 8, borderRadius: 2, background: t.color, flexShrink: 0 }} />
              <span style={{ color: selected === name ? "white" : "#64748B", fontSize: 9 }}>{name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── inspector panel ── */}
      {selected && (
        <div style={{
          position: "absolute", top: 70, right: 16, zIndex: 10,
          width: 230,
          background: "#0F172A",
          border: `1px solid ${selectedTable.color}44`,
          borderRadius: 8, padding: 14,
          maxHeight: "80vh", overflowY: "auto",
        }}>
          <div style={{
            color: selectedTable.color, fontSize: 12, fontWeight: "bold",
            marginBottom: 8, borderBottom: `1px solid ${selectedTable.color}33`,
            paddingBottom: 6,
          }}>
            {selected}
          </div>

          <div style={{ color: "#64748B", fontSize: 10, marginBottom: 6, letterSpacing: 2 }}>RELATIONSHIPS</div>
          {relatedTables.length === 0
            ? <div style={{ color: "#334155", fontSize: 10 }}>No relations</div>
            : relatedTables.map((r, i) => (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  marginBottom: 5, cursor: "pointer",
                }}
                onClick={() => setSelected(r.table)}
              >
                <div style={{ width: 6, height: 6, borderRadius: 1, background: schema[r.table].color, flexShrink: 0 }} />
                <span style={{ color: "#94A3B8", fontSize: 10 }}>{r.direction} {r.table}</span>
                <span style={{ color: "#475569", fontSize: 9, marginLeft: "auto" }}>{r.label}</span>
              </div>
            ))
          }

          <div style={{ color: "#64748B", fontSize: 10, marginBottom: 6, marginTop: 12, letterSpacing: 2 }}>
            FIELDS ({selectedTable.fields.length})
          </div>
          {selectedTable.fields.map((f, i) => (
            <div key={i} style={{ marginBottom: 3 }}>
              <span style={{
                fontSize: 9,
                color: f.type.includes("PK") ? "#FCD34D" : f.type.includes("FK") ? "#86EFAC" : "#475569",
              }}>
                {f.name}
              </span>
              <span style={{ fontSize: 8, color: "#1E293B", marginLeft: 6 }}>{f.type}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── hint ── */}
      <div style={{ position: "absolute", bottom: 16, right: 16, zIndex: 10, color: "#1E293B", fontSize: 10 }}>
        scroll to zoom · drag to pan · click table to inspect
      </div>

      {/* ── SVG canvas ── */}
      <svg
        ref={svgRef}
        width="100%" height="100%"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => setSelected(null)}
        style={{ cursor: dragging ? "grabbing" : "grab", userSelect: "none", display: "block" }}
      >
        {/* dark background */}
        <rect width="100%" height="100%" fill="#020617" />
        {/* dot-grid */}
        <defs>
          <pattern id="dots" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#0F172A" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />

        {/* all diagram content */}
        <g transform={`translate(${pan.x + 20}, ${pan.y + 60}) scale(${scale})`}>
          {renderRelationships()}
          {Object.keys(schema).map(name => renderTable(name))}
        </g>
      </svg>
    </div>
  );
}