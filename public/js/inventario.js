// inventario.js
// Calculos de inventario sin DOM: metodo PEPS (Primeras Entradas, Primeras
// Salidas).
//
// El backend guarda el kardex con Costo Promedio Ponderado. PEPS se
// recalcula aqui a partir de los mismos movimientos: de cada entrada se toma
// su costo de compra (deudor / entrada) y cada salida consume primero las
// unidades mas antiguas.

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

/**
 * Recalcula el kardex con el metodo PEPS.
 * Recibe los registros tal como los devuelve /api/kardex (ya ordenados) y
 * devuelve registros con la misma forma, mas `capas` (lotes que quedan en
 * existencia despues de cada movimiento: [{ cantidad, costo }]).
 * En PEPS, `costoUnitario` es el costo del movimiento: el de compra en una
 * entrada, o el promedio de los lotes consumidos en una salida.
 */
export function calcularPEPS(registros) {
  const capas = [];

  return registros.map((r) => {
    let deudor = 0;
    let acreedor = 0;
    let costoUnitario = 0;

    if (r.entrada > 0) {
      costoUnitario = r.deudor / r.entrada;
      capas.push({ cantidad: r.entrada, costo: costoUnitario });
      deudor = round2(r.deudor);
    } else if (r.salida > 0) {
      let pendiente = r.salida;
      while (pendiente > 0 && capas.length) {
        const capa = capas[0];
        const tomar = Math.min(pendiente, capa.cantidad);
        acreedor += tomar * capa.costo;
        capa.cantidad = round2(capa.cantidad - tomar);
        pendiente = round2(pendiente - tomar);
        if (capa.cantidad <= 0) capas.shift();
      }
      acreedor = round2(acreedor);
      costoUnitario = acreedor / r.salida;
    }

    const existencias = round2(capas.reduce((s, c) => s + c.cantidad, 0));
    const saldo = round2(capas.reduce((s, c) => s + c.cantidad * c.costo, 0));

    return {
      ...r,
      costoUnitario,
      deudor,
      acreedor,
      existencias,
      saldo,
      capas: capas.map((c) => ({ ...c })),
    };
  });
}
