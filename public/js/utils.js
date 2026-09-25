// utils.js
// Funciones auxiliares compartidas por todos los modulos.

export const IVA_TASA = 0.13; // 13% - El Salvador

/** Formatea un numero como moneda en dolares (USD, moneda oficial en El Salvador). */
export function formatMoney(valor) {
  const n = Number(valor) || 0;
  return n.toLocaleString('es-SV', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
}

/** Formatea una fecha (Date, Timestamp de Firestore, o string ISO) como dd/mm/aaaa. */
export function formatDate(fecha) {
  let d;
  if (!fecha) return '';
  if (typeof fecha.toDate === 'function') {
    d = fecha.toDate();
  } else {
    d = new Date(fecha);
  }
  if (Number.isNaN(d.getTime())) return String(fecha);
  return d.toLocaleDateString('es-SV', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Devuelve la fecha de hoy en formato yyyy-mm-dd, util para <input type="date">. */
export function hoyISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Naturaleza contable de un tipo de cuenta.
 * Activo y Egreso/Gasto son de naturaleza DEUDORA (aumentan con el Debe).
 * Pasivo, Patrimonio e Ingreso son de naturaleza ACREEDORA (aumentan con el Haber).
 */
export function naturalezaCuenta(tipo) {
  return tipo === 'activo' || tipo === 'egreso' ? 'deudora' : 'acreedora';
}

/**
 * Calcula el efecto neto (delta) que un movimiento debe/haber tiene sobre el
 * saldo acumulado de una cuenta, respetando su naturaleza contable.
 * Un resultado positivo aumenta el saldo del lado natural de la cuenta.
 */
export function efectoSaldo(tipo, debe, haber) {
  const d = Number(debe) || 0;
  const h = Number(haber) || 0;
  return naturalezaCuenta(tipo) === 'deudora' ? d - h : h - d;
}

/** Calcula el IVA (13%) de un monto gravado. */
export function calcularIVA(montoGravado) {
  const base = Number(montoGravado) || 0;
  const iva = round2(base * IVA_TASA);
  return { base: round2(base), iva, total: round2(base + iva) };
}

/** Dado un total que incluye IVA, separa el IVA y la base gravada. */
export function separarIVAdeTotal(total) {
  const t = Number(total) || 0;
  const base = round2(t / (1 + IVA_TASA));
  const iva = round2(t - base);
  return { base, iva, total: round2(t) };
}

export function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

/** Genera un id corto legible (no criptografico) para uso como referencia visual. */
export function idCorto() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/** Muestra una notificacion tipo "toast" en la esquina de la pantalla. */
export function toast(mensaje, tipo = 'info') {
  const colores = {
    info: 'bg-slate-800',
    exito: 'bg-emerald-600',
    error: 'bg-rose-600',
    advertencia: 'bg-amber-500',
  };
  const cont = document.getElementById('toast-container');
  if (!cont) {
    // eslint-disable-next-line no-alert
    console.log(`[${tipo}] ${mensaje}`);
    return;
  }
  const el = document.createElement('div');
  el.className = `${colores[tipo] || colores.info} text-white text-sm px-4 py-3 rounded-lg shadow-lg mb-2 opacity-0 translate-y-2 transition-all duration-300`;
  el.textContent = mensaje;
  cont.appendChild(el);
  requestAnimationFrame(() => {
    el.classList.remove('opacity-0', 'translate-y-2');
  });
  setTimeout(() => {
    el.classList.add('opacity-0');
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

/** Agrupa un arreglo de movimientos por mes (yyyy-mm) sumando un campo. */
export function agruparPorMes(items, fechaKey, valorFn) {
  const mapa = new Map();
  for (const item of items) {
    const f = item[fechaKey]?.toDate ? item[fechaKey].toDate() : new Date(item[fechaKey]);
    if (Number.isNaN(f.getTime())) continue;
    const clave = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;
    mapa.set(clave, (mapa.get(clave) || 0) + valorFn(item));
  }
  return [...mapa.entries()].sort(([a], [b]) => (a > b ? 1 : -1));
}

// Iconos SVG de linea (estilo Lucide). Usan currentColor, asi que toman el
// color del texto donde se colocan.
const ICONOS = {
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
};

/** Devuelve el HTML de un icono SVG. `clase` controla tamano y alineacion. */
export function icono(nombre, clase = 'w-4 h-4') {
  return `<svg class="${clase}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS[nombre]}</svg>`;
}
