// documentos.js
// Modulo: Documentos (archivos de contabilidad independientes).
//
// Igual que "Nuevo", "Guardar" y "Abrir" en un procesador de texto, pero
// cada documento es su propio catalogo de cuentas + Libro Diario + Kardex,
// completamente separado de los demas (util porque antes solo se podia
// trabajar en un unico "expediente" contable a la vez).

import { listarDocumentos, crearDocumento, renombrarDocumento, refrescarTodo } from './db.js';
import { getDocumentoActivo, setDocumentoActivo } from './api.js';
import { toast } from './utils.js';

let documentosCache = [];
let documentoActivo = null; // { id, nombre, actualizadoEn }

function formatFechaCorta(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/**
 * Se llama una sola vez, antes de iniciar cuentas.js/diario.js/kardex.js/etc,
 * para decidir con que documento se va a trabajar: el que ya estaba activo,
 * si no el mas reciente, y si el usuario todavia no tiene ninguno le crea
 * uno de entrada para no arrancar con la pantalla rota.
 */
export async function asegurarDocumentoActivo() {
  documentosCache = await listarDocumentos();

  const guardadoId = getDocumentoActivo();
  let elegido = documentosCache.find((d) => d.id === guardadoId);

  if (!elegido && documentosCache.length) {
    elegido = documentosCache[0]; // la API ya los entrega del mas reciente al mas antiguo
  }

  if (!elegido) {
    elegido = await crearDocumento('Documento 1');
    documentosCache = [elegido, ...documentosCache];
  }

  documentoActivo = elegido;
  setDocumentoActivo(elegido.id);
}

export function initDocumentos() {
  actualizarNombreVisible();

  document.getElementById('btn-doc-nuevo').addEventListener('click', crearNuevoDocumento);
  document.getElementById('btn-doc-guardar').addEventListener('click', guardarDocumentoActual);
  document.getElementById('btn-doc-abrir').addEventListener('click', toggleListaDocumentos);

  document.addEventListener('click', (e) => {
    const lista = document.getElementById('lista-documentos');
    if (!lista.classList.contains('hidden') && !e.target.closest('#doc-selector-abrir')) {
      lista.classList.add('hidden');
    }
  });
}

function actualizarNombreVisible() {
  const el = document.getElementById('doc-nombre-actual');
  if (el) el.textContent = documentoActivo ? documentoActivo.nombre : '—';
}

async function crearNuevoDocumento() {
  const sugerido = `Documento ${documentosCache.length + 1}`;
  const nombre = prompt('Nombre del nuevo documento (empieza vacio, sin cuentas ni partidas):', sugerido);
  if (nombre === null) return; // cancelado
  const limpio = nombre.trim() || sugerido;

  try {
    const doc = await crearDocumento(limpio);
    documentosCache = [doc, ...documentosCache];
    await activarDocumento(doc.id, { avisar: false });
    toast(`Documento "${doc.nombre}" creado.`, 'exito');
  } catch (err) {
    toast(`No se pudo crear el documento: ${err.message}`, 'error');
  }
}

async function guardarDocumentoActual() {
  if (!documentoActivo) return;
  const nombre = prompt('Guardar documento como:', documentoActivo.nombre);
  if (nombre === null) return; // cancelado
  const limpio = nombre.trim();
  if (!limpio) {
    toast('El nombre no puede quedar vacio.', 'advertencia');
    return;
  }

  try {
    const doc = await renombrarDocumento(documentoActivo.id, limpio);
    documentoActivo = doc;
    documentosCache = documentosCache.map((d) => (d.id === doc.id ? doc : d));
    actualizarNombreVisible();
    toast('Documento guardado.', 'exito');
  } catch (err) {
    toast(`No se pudo guardar: ${err.message}`, 'error');
  }
}

function toggleListaDocumentos() {
  const lista = document.getElementById('lista-documentos');
  if (!lista.classList.contains('hidden')) {
    lista.classList.add('hidden');
    return;
  }
  renderListaDocumentos();
  lista.classList.remove('hidden');
}

function renderListaDocumentos() {
  const lista = document.getElementById('lista-documentos');

  if (!documentosCache.length) {
    lista.innerHTML = '<li class="px-3 py-2 text-stone-500">No hay documentos guardados.</li>';
    return;
  }

  lista.innerHTML = documentosCache
    .map(
      (d) => `
      <li data-id="${d.id}" class="px-3 py-2 cursor-pointer hover:bg-amber-500/15 flex items-center justify-between gap-3 ${
        documentoActivo && d.id === documentoActivo.id ? 'bg-amber-500/15 font-medium' : ''
      }">
        <span class="truncate">${d.nombre}</span>
        <span class="text-xs text-stone-500 shrink-0">${formatFechaCorta(d.actualizadoEn)}</span>
      </li>`
    )
    .join('');

  lista.querySelectorAll('[data-id]').forEach((li) => {
    li.addEventListener('click', () => activarDocumento(li.dataset.id));
  });
}

async function activarDocumento(id, { avisar = true } = {}) {
  document.getElementById('lista-documentos').classList.add('hidden');
  if (documentoActivo && id === documentoActivo.id) return;

  const doc = documentosCache.find((d) => d.id === id);
  setDocumentoActivo(id);
  documentoActivo = doc || documentoActivo;
  actualizarNombreVisible();

  try {
    await refrescarTodo();
    if (avisar) toast(`Ahora estas trabajando en "${documentoActivo.nombre}".`, 'exito');
  } catch (err) {
    toast(`No se pudo abrir el documento: ${err.message}`, 'error');
  }
}
