export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://127.0.0.1:8000');

const humedadesTeoricas = {
  Grava: '4% a 8%',
  Arena: '6% a 10%',
  'Arena limosa': '8% a 13%',
  Limo: '10% a 16%',
  'Limo de baja plasticidad': '10% a 16%',
  'Arcilla baja plasticidad': '12% a 20%',
  'Arcilla de baja plasticidad': '12% a 20%',
  'Arcilla alta plasticidad': '18% a 30%',
  'Arcilla de alta plasticidad': '18% a 30%',
};

const rangosMolde = {
  'Molde 4 pulgadas': [930, 955],
  'Molde 6 pulgadas': [2100, 2150],
};

function polyfit2(xs, ys){
  const n = xs.length;
  const sx = xs.reduce((a,b)=>a+b,0);
  const sx2 = xs.reduce((a,b)=>a+b*b,0);
  const sx3 = xs.reduce((a,b)=>a+b**3,0);
  const sx4 = xs.reduce((a,b)=>a+b**4,0);
  const sy = ys.reduce((a,b)=>a+b,0);
  const sxy = xs.reduce((a,x,i)=>a+x*ys[i],0);
  const sx2y = xs.reduce((a,x,i)=>a+x*x*ys[i],0);
  const m = [[sx4,sx3,sx2,sx2y],[sx3,sx2,sx,sxy],[sx2,sx,n,sy]];
  for(let i=0;i<3;i++){
    let pivot = m[i][i] || 1e-12;
    for(let j=i;j<4;j++) m[i][j] /= pivot;
    for(let k=0;k<3;k++){
      if(k===i) continue;
      const factor = m[k][i];
      for(let j=i;j<4;j++) m[k][j] -= factor*m[i][j];
    }
  }
  return [m[0][3], m[1][3], m[2][3]];
}

function linspace(min, max, count){
  const step = (max-min)/(count-1);
  return Array.from({length:count}, (_,i)=>min+step*i);
}

function corregirDensidad(densidadSeca, porcentajeGrueso, gsGrueso){
  const pg = Number(porcentajeGrueso || 0)/100;
  if(pg <= 0) return densidadSeca;
  const gammaGrueso = Number(gsGrueso || 2.65);
  return 1 / (((1-pg)/densidadSeca) + (pg/gammaGrueso));
}

function calcularSaturacion(gs, s, humedades){
  return humedades.map(w=>{
    const wd = w/100;
    return (gs*1.0) / (1 + ((wd*gs)/s));
  });
}

function validarVolumen(molde, volumen){
  if(!rangosMolde[molde]) return [];
  const [min,max] = rangosMolde[molde];
  if(volumen < min) return [`Volumen bajo para ${molde}. Verificar calibracion del molde.`];
  if(volumen > max) return [`Volumen alto para ${molde}. Revisar dimensiones internas del molde.`];
  return [];
}

function recomendacionHumedad(data){
  let nota = `Humedad inicial recomendada para ${data.tipo_suelo || 'suelo seleccionado'}: ${humedadesTeoricas[data.tipo_suelo] || '10% a 16%'}.`;
  if(Number(data.pasa_200) >= 50 && Number(data.indice_plastico) >= 15){
    nota += ' Por el contenido de finos y plasticidad, iniciar con incrementos de 2% y controlar amasado uniforme.';
  }else if(Number(data.pasa_200) < 35){
    nota += ' Por menor contenido de finos, usar incrementos de agua moderados y evitar segregacion.';
  }
  if(data.sucs) nota += ` Clasificacion SUCS registrada: ${data.sucs}.`;
  if(data.aashto) nota += ` Clasificacion AASHTO registrada: ${data.aashto}.`;
  if(data.sistema_suelo) nota += ` Sistema seleccionado: ${data.sistema_suelo}.`;
  return nota;
}

function calcularLocal(data){
  const resultados = [];
  const humedades = [];
  const densidades = [];
  const densidadesCorregidas = [];
  const alarmas = [];

  data.puntos.forEach((p,i)=>{
    alarmas.push(...validarVolumen(data.molde, Number(p.volumen)));
    const pesoSueloHumedo = Number(p.peso_molde_suelo) - Number(p.peso_molde);
    const densidadHumeda = Number(p.volumen) ? pesoSueloHumedo / Number(p.volumen) : 0;
    const humedad = Number(p.humedad);
    const densidadSeca = humedad > -100 ? densidadHumeda / (1 + humedad/100) : 0;
    const densidadCorregida = data.correccion?.aplicar ? corregirDensidad(densidadSeca, data.correccion.porcentaje_grueso, data.correccion.gs_grueso) : densidadSeca;

    humedades.push(humedad);
    densidades.push(densidadSeca);
    densidadesCorregidas.push(densidadCorregida);
    resultados.push({
      punto: i+1,
      molde_id: p.molde_id || '',
      peso_suelo_humedo: pesoSueloHumedo,
      densidad_humeda: densidadHumeda,
      humedad,
      densidad_seca: densidadSeca,
      densidad_corregida: densidadCorregida,
    });

    if(humedad < 1) alarmas.push(`Punto ${i+1}: humedad demasiado baja.`);
    if(humedad > 40) alarmas.push(`Punto ${i+1}: humedad demasiado alta.`);
    if(densidadSeca <= 0) alarmas.push(`Punto ${i+1}: densidad seca invalida.`);
    if(densidadHumeda < densidadSeca) alarmas.push(`Punto ${i+1}: densidad humeda menor que densidad seca.`);
  });

  for(let i=1;i<humedades.length;i++){
    if(humedades[i] <= humedades[i-1]) alarmas.push(`Humedad no creciente entre punto ${i} y ${i+1}.`);
    if(Math.abs(densidades[i]-densidades[i-1]) > 0.15) alarmas.push(`Salto brusco de densidad entre punto ${i} y ${i+1}.`);
  }
  if(humedades.length < 3) return { error:'Se necesitan al menos 3 puntos para generar la curva Proctor.' };

  const coef = polyfit2(humedades, densidades);
  const x = linspace(Math.min(...humedades), Math.max(...humedades), 120);
  const y = x.map(h=>coef[0]*h*h + coef[1]*h + coef[2]);
  const hOpt = coef[0] !== 0 ? -coef[1]/(2*coef[0]) : humedades[densidades.indexOf(Math.max(...densidades))];
  const dMax = coef[0]*hOpt*hOpt + coef[1]*hOpt + coef[2];

  let yCorr = y;
  let hOptCorr = hOpt;
  let dMaxCorr = dMax;
  if(data.correccion?.aplicar){
    const coefCorr = polyfit2(humedades, densidadesCorregidas);
    yCorr = x.map(h=>coefCorr[0]*h*h + coefCorr[1]*h + coefCorr[2]);
    hOptCorr = coefCorr[0] !== 0 ? -coefCorr[1]/(2*coefCorr[0]) : hOpt;
    dMaxCorr = coefCorr[0]*hOptCorr*hOptCorr + coefCorr[1]*hOptCorr + coefCorr[2];
  }

  if(coef[0] >= 0) alarmas.push('La curva no presenta concavidad negativa. Revisar datos de compactacion.');
  if(hOpt < Math.min(...humedades) || hOpt > Math.max(...humedades)) alarmas.push('La humedad optima queda fuera del rango ensayado. Agregar puntos adicionales.');
  if(Math.max(...densidades) === densidades[densidades.length-1]) alarmas.push('El ultimo punto sigue siendo el mayor. Puede faltar un punto con mayor humedad.');

  return {
    datos_generales: data.datos_generales,
    metodo: data.metodo,
    molde: data.molde,
    parametros: {
      peso_martillo: data.peso_martillo,
      altura_caida: data.altura_caida,
      capas: data.capas,
      golpes_capa: data.golpes_capa,
      volumen_esperado: data.volumen_esperado,
      gs_suelo: data.gs_suelo,
      sistema_suelo: data.sistema_suelo,
      aashto: data.aashto,
      sucs: data.sucs,
      moldes: data.moldes || [],
    },
    resultados,
    humedad_optima: hOpt,
    densidad_maxima: dMax,
    humedad_optima_corregida: hOptCorr,
    densidad_maxima_corregida: dMaxCorr,
    recomendacion_humedad: recomendacionHumedad(data),
    curva: {
      x,
      original: y,
      corregida: yCorr,
      s80: calcularSaturacion(Number(data.gs_suelo || 2.65), 0.80, x),
      s90: calcularSaturacion(Number(data.gs_suelo || 2.65), 0.90, x),
      s100: calcularSaturacion(Number(data.gs_suelo || 2.65), 1.00, x),
    },
    alarmas: [...new Set(alarmas)],
  };
}

export async function calcularProctor(body){
  if(import.meta.env.PROD && !import.meta.env.VITE_API_URL){
    return calcularLocal(body);
  }
  try{
    const res = await fetch(`${API_URL}/calcular-proctor`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)});
    if(!res.ok) throw new Error('API no disponible');
    return res.json();
  }catch{
    return calcularLocal(body);
  }
}
