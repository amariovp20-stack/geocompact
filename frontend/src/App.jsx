import { useEffect, useMemo, useState } from 'react';
import { calcularProctor } from './services/api';
import Resultados from './components/Resultados';
import logoGeoCompact from './assets/geocompact-logo.svg';

const presets = {
  'Proctor Estandar': { peso_martillo: 2.5, altura_caida: 305, capas: 3, golpes_capa: 25 },
  'Proctor Modificado': { peso_martillo: 4.54, altura_caida: 457, capas: 5, golpes_capa: 25 },
};

const volumenMolde = { 'Molde 4 pulgadas': 943, 'Molde 6 pulgadas': 2124, 'Molde personalizado': 943 };
const derechosReservados = 'Derechos reservados GEOSERVI LAB - ING. ABEL MARIO VEGA PEREZ.';

const clasificaciones = {
  AASHTO: [
    { codigo: 'A-1-a', nombre: 'Fragmentos de roca, grava y arena bien gradada', rango: [4, 8], sucs: 'GW/GP/SW/SP' },
    { codigo: 'A-1-b', nombre: 'Arena gruesa con grava', rango: [5, 9], sucs: 'SW/SP' },
    { codigo: 'A-2-4', nombre: 'Grava o arena limosa', rango: [7, 12], sucs: 'GM/SM' },
    { codigo: 'A-2-5', nombre: 'Grava o arena limosa elastica', rango: [8, 14], sucs: 'GM/SM/ML' },
    { codigo: 'A-2-6', nombre: 'Grava o arena arcillosa', rango: [9, 16], sucs: 'GC/SC/CL' },
    { codigo: 'A-2-7', nombre: 'Grava o arena arcillosa plastica', rango: [11, 19], sucs: 'GC/SC/CH' },
    { codigo: 'A-3', nombre: 'Arena fina', rango: [6, 10], sucs: 'SP' },
    { codigo: 'A-4', nombre: 'Suelo limoso', rango: [10, 16], sucs: 'ML/OL' },
    { codigo: 'A-5', nombre: 'Suelo limoso elastico', rango: [13, 21], sucs: 'MH' },
    { codigo: 'A-6', nombre: 'Suelo arcilloso', rango: [12, 20], sucs: 'CL' },
    { codigo: 'A-7-5', nombre: 'Arcilla plastica con LL alto', rango: [16, 26], sucs: 'CH/OH' },
    { codigo: 'A-7-6', nombre: 'Arcilla muy plastica', rango: [18, 30], sucs: 'CH' },
  ],
  SUCS: [
    { codigo: 'GW', nombre: 'Grava bien gradada', rango: [4, 8], aashto: 'A-1-a' },
    { codigo: 'GP', nombre: 'Grava mal gradada', rango: [4, 9], aashto: 'A-1-a' },
    { codigo: 'GM', nombre: 'Grava limosa', rango: [7, 12], aashto: 'A-2-4' },
    { codigo: 'GC', nombre: 'Grava arcillosa', rango: [9, 16], aashto: 'A-2-6' },
    { codigo: 'SW', nombre: 'Arena bien gradada', rango: [5, 9], aashto: 'A-1-b' },
    { codigo: 'SP', nombre: 'Arena mal gradada', rango: [6, 10], aashto: 'A-3' },
    { codigo: 'SM', nombre: 'Arena limosa', rango: [8, 13], aashto: 'A-2-4' },
    { codigo: 'SC', nombre: 'Arena arcillosa', rango: [9, 16], aashto: 'A-2-6' },
    { codigo: 'ML', nombre: 'Limo de baja plasticidad', rango: [10, 16], aashto: 'A-4' },
    { codigo: 'CL', nombre: 'Arcilla de baja plasticidad', rango: [12, 20], aashto: 'A-6' },
    { codigo: 'OL', nombre: 'Limo o arcilla organica de baja plasticidad', rango: [14, 22], aashto: 'A-4/A-6' },
    { codigo: 'MH', nombre: 'Limo elastico', rango: [15, 24], aashto: 'A-5' },
    { codigo: 'CH', nombre: 'Arcilla de alta plasticidad', rango: [18, 30], aashto: 'A-7-6' },
    { codigo: 'OH', nombre: 'Suelo organico de alta plasticidad', rango: [20, 32], aashto: 'A-7-5' },
    { codigo: 'PT', nombre: 'Turba y suelos altamente organicos', rango: [25, 40], aashto: 'No recomendado para Proctor' },
  ],
};

const crearPunto = (i, molde) => ({
  molde_id: molde.id,
  peso_molde_suelo: [6100, 6250, 6370, 6400, 6350][i] || '',
  peso_molde: molde.peso,
  volumen: molde.volumen,
  humedad: [6, 8, 10, 12, 14][i] || '',
  peso_recipiente: '',
  peso_recipiente_suelo_humedo: '',
  peso_recipiente_suelo_seco: '',
});

export default function App(){
  const [datosGenerales, setDatosGenerales] = useState({ proyecto:'', solicitante:'', ubicacion:'', muestra:'', profundidad:'', procedencia:'', fecha:'', tecnico:'', observaciones:'' });
  const [metodo, setMetodo] = useState('Proctor Modificado');
  const [molde, setMolde] = useState('Molde 4 pulgadas');
  const [modoMoldes, setModoMoldes] = useState('unico');
  const [moldesEnsayo, setMoldesEnsayo] = useState([{ id:'M1', nombre:'Molde 1', peso:4200, volumen:943 }]);
  const [param, setParam] = useState({ ...presets['Proctor Modificado'], volumen_esperado: 943 });
  const [gsSuelo, setGsSuelo] = useState(2.65);
  const [sistemaSuelo, setSistemaSuelo] = useState('SUCS');
  const [tipoSuelo, setTipoSuelo] = useState('Limo de baja plasticidad');
  const [aashto, setAashto] = useState('A-4');
  const [sucs, setSucs] = useState('ML');
  const [pasa200, setPasa200] = useState(45);
  const [ll, setLl] = useState(30);
  const [ip, setIp] = useState(10);
  const [puntos, setPuntos] = useState(() => Array.from({length:5}, (_,i) => crearPunto(i, { id:'M1', peso:4200, volumen:943 })));
  const [preparacionHumedad, setPreparacionHumedad] = useState(() => Array.from({length:5}, (_,i) => ({
    humedad_objetivo: [6, 8, 10, 12, 14][i] || '',
    humedad_inicial: 0,
    masa_suelo_seco: 3000,
  })));
  const [aplicarCorreccion, setAplicarCorreccion] = useState(false);
  const [porcentajeGrueso, setPorcentajeGrueso] = useState(0);
  const [gsGrueso, setGsGrueso] = useState(2.65);
  const [resultados, setResultados] = useState(null);
  const [error, setError] = useState('');

  const moldePrincipal = moldesEnsayo[0];

  const clasificacionSeleccionada = useMemo(() => {
    const codigo = sistemaSuelo === 'SUCS' ? sucs : aashto;
    return clasificaciones[sistemaSuelo].find(c => c.codigo === codigo) || clasificaciones[sistemaSuelo][0];
  }, [sistemaSuelo, sucs, aashto]);

  const rangoHumedad = useMemo(() => {
    const ajusteFinos = Number(pasa200) >= 50 ? 1 : Number(pasa200) < 35 ? -1 : 0;
    const ajustePlasticidad = Number(ip) >= 20 ? 2 : Number(ip) >= 10 ? 1 : 0;
    const min = Math.max(3, clasificacionSeleccionada.rango[0] + ajusteFinos);
    const max = Math.min(45, clasificacionSeleccionada.rango[1] + ajusteFinos + ajustePlasticidad);
    return { min, max, recomendado: Number(((min + max) / 2).toFixed(1)) };
  }, [clasificacionSeleccionada, pasa200, ip]);

  const humedadesTeoricas = useMemo(() => {
    const cantidad = Math.max(puntos.length, 1);
    const paso = cantidad === 1 ? 0 : (rangoHumedad.max - rangoHumedad.min) / (cantidad - 1);
    return Array.from({length:cantidad}, (_,i) => Number((rangoHumedad.min + paso * i).toFixed(1)));
  }, [puntos.length, rangoHumedad]);

  useEffect(() => {
    setPreparacionHumedad(prev => {
      const nuevos = Array.from({length:puntos.length}, (_,i) => prev[i] || {
        humedad_objetivo: humedadesTeoricas[i] || '',
        humedad_inicial: 0,
        masa_suelo_seco: 3000,
      });
      return nuevos.map((item,i) => ({
        ...item,
        humedad_objetivo: item.humedad_objetivo === '' ? humedadesTeoricas[i] : item.humedad_objetivo,
      }));
    });
  }, [puntos.length, humedadesTeoricas]);

  const sincronizarMoldeEnPuntos = (moldeActualizado, soloMolde = false) => {
    setPuntos(prev => prev.map(p => {
      if(soloMolde && p.molde_id !== moldeActualizado.id) return p;
      return { ...p, molde_id: moldeActualizado.id, peso_molde: Number(moldeActualizado.peso), volumen: Number(moldeActualizado.volumen) };
    }));
  };

  const actualizarMolde = (i, campo, valor) => {
    const normalizado = campo === 'nombre' ? valor : Number(valor);
    setMoldesEnsayo(prev => {
      const nuevos = prev.map((m,idx) => idx === i ? {...m, [campo]: normalizado} : m);
      const actualizado = nuevos[i];
      if(i === 0){
        setParam(p => ({...p, volumen_esperado: Number(actualizado.volumen)}));
      }
      sincronizarMoldeEnPuntos(actualizado, modoMoldes === 'multiple');
      return nuevos;
    });
  };

  const agregarMolde = () => {
    const siguiente = moldesEnsayo.length + 1;
    setModoMoldes('multiple');
    setMoldesEnsayo([...moldesEnsayo, { id:`M${siguiente}`, nombre:`Molde ${siguiente}`, peso:4200, volumen:param.volumen_esperado }]);
  };

  const eliminarMolde = (id) => {
    if(moldesEnsayo.length === 1) return;
    const restantes = moldesEnsayo.filter(m => m.id !== id);
    setMoldesEnsayo(restantes);
    sincronizarMoldeEnPuntos(restantes[0], false);
  };

  const actualizarVolumenEsperado = (volumen) => {
    const valor = Number(volumen);
    setParam(prev => ({...prev, volumen_esperado: valor}));
    actualizarMolde(0, 'volumen', valor);
  };

  useEffect(() => setParam(prev => ({ ...prev, ...presets[metodo] })), [metodo]);
  useEffect(() => actualizarVolumenEsperado(volumenMolde[molde]), [molde]);
  useEffect(() => {
    setTipoSuelo(clasificacionSeleccionada.nombre);
    if(sistemaSuelo === 'SUCS'){
      setAashto((clasificacionSeleccionada.aashto || aashto).split('/')[0]);
    }else{
      setSucs((clasificacionSeleccionada.sucs || sucs).split('/')[0]);
    }
  }, [sistemaSuelo, clasificacionSeleccionada]);

  const actualizarDato = (campo, valor) => setDatosGenerales({ ...datosGenerales, [campo]: valor });
  const actualizarPunto = (i, campo, valor) => { const n=[...puntos]; n[i][campo]=campo === 'molde_id' ? valor : Number(valor); setPuntos(n); };
  const asignarMoldePunto = (i, moldeId) => {
    const m = moldesEnsayo.find(item => item.id === moldeId) || moldePrincipal;
    const n=[...puntos];
    n[i] = {...n[i], molde_id:m.id, peso_molde:Number(m.peso), volumen:Number(m.volumen)};
    setPuntos(n);
  };
  const agregarFila = () => setPuntos([...puntos, crearPunto(puntos.length, moldePrincipal)]);
  const eliminarFila = (i) => {
    setPuntos(puntos.filter((_,idx)=>idx!==i));
    setPreparacionHumedad(preparacionHumedad.filter((_,idx)=>idx!==i));
  };
  const actualizarPreparacion = (i, campo, valor) => {
    const n=[...preparacionHumedad];
    n[i] = {...n[i], [campo]:Number(valor)};
    setPreparacionHumedad(n);
  };
  const aguaAAgregar = (prep) => {
    const masaSeca = Number(prep.masa_suelo_seco);
    const objetivo = Number(prep.humedad_objetivo);
    const inicial = Number(prep.humedad_inicial);
    if(!masaSeca || objetivo < inicial) return 0;
    return Number((masaSeca * (objetivo - inicial) / 100).toFixed(1));
  };
  const aplicarRangoHumedad = () => {
    setPreparacionHumedad(preparacionHumedad.map((p,i)=>({...p, humedad_objetivo:humedadesTeoricas[i]})));
    setPuntos(puntos.map((p,i)=>({...p, humedad:humedadesTeoricas[i]})));
  };
  const aplicarHumedadesPreparacion = () => setPuntos(puntos.map((p,i)=>({...p, humedad:Number(preparacionHumedad[i]?.humedad_objetivo || 0)})));
  const calcularHumedadPunto = (i) => {
    const p = puntos[i];
    const recipiente = Number(p.peso_recipiente);
    const humedo = Number(p.peso_recipiente_suelo_humedo);
    const seco = Number(p.peso_recipiente_suelo_seco);
    const sueloSeco = seco - recipiente;
    if(!sueloSeco || sueloSeco <= 0) return;
    const humedad = ((humedo - seco) / sueloSeco) * 100;
    actualizarPunto(i, 'humedad', Number(humedad.toFixed(2)));
  };
  const calcularTodasHumedades = () => puntos.forEach((_,i) => calcularHumedadPunto(i));

  const calcular = async()=>{
    setError('');
    try{
      const body = {
        datos_generales: datosGenerales,
        metodo,
        molde,
        moldes: moldesEnsayo,
        ...param,
        gs_suelo:Number(gsSuelo),
        sistema_suelo: sistemaSuelo,
        tipo_suelo: tipoSuelo,
        aashto,
        sucs,
        pasa_200:Number(pasa200),
        limite_liquido:Number(ll),
        indice_plastico:Number(ip),
        puntos,
        correccion:{ aplicar: aplicarCorreccion, porcentaje_grueso:Number(porcentajeGrueso), gs_grueso:Number(gsGrueso)}
      };
      setResultados(await calcularProctor(body));
    }catch(e){ setError(e.message); }
  };

  return <div className="page">
    <header className="hero"><div className="brand"><img src={logoGeoCompact} alt="GeoCompact Pro" /><div><h1>GeoCompact Pro v5</h1><p>Reporte profesional de ensayo Proctor estandar y modificado</p></div></div><span className="badge">Laboratorio geotecnico</span></header>

    <section className="card"><h2>1. Datos generales</h2><div className="grid3">{Object.keys(datosGenerales).map(k=><label key={k}>{k.replace('_',' ')}<input value={datosGenerales[k]} onChange={e=>actualizarDato(k,e.target.value)} /></label>)}</div></section>

    <section className="card"><h2>2. Configuracion del ensayo y moldes</h2><div className="grid4">
      <label>Metodo<select value={metodo} onChange={e=>setMetodo(e.target.value)}><option>Proctor Estandar</option><option>Proctor Modificado</option></select></label>
      <label>Tipo de molde<select value={molde} onChange={e=>setMolde(e.target.value)}><option>Molde 4 pulgadas</option><option>Molde 6 pulgadas</option><option>Molde personalizado</option></select></label>
      <label>Uso de moldes<select value={modoMoldes} onChange={e=>setModoMoldes(e.target.value)}><option value="unico">Un solo molde</option><option value="multiple">Varios moldes por punto</option></select></label>
      <label>Gs suelo<input type="number" step="0.01" value={gsSuelo} onChange={e=>setGsSuelo(e.target.value)} /></label>
      <label>Volumen esperado<input type="number" value={param.volumen_esperado} onChange={e=>actualizarVolumenEsperado(e.target.value)} /></label>
    </div><div className="preset"><b>Parametros cargados:</b> martillo {param.peso_martillo} kg - caida {param.altura_caida} mm - {param.capas} capas - {param.golpes_capa} golpes/capa</div>
      <div className="tableWrap"><table><thead><tr><th>Molde</th><th>Peso molde (g)</th><th>Volumen (cm3)</th><th></th></tr></thead><tbody>{moldesEnsayo.map((m,i)=><tr key={m.id}><td><input value={m.nombre} onChange={e=>actualizarMolde(i,'nombre',e.target.value)} /></td><td><input type="number" value={m.peso} onChange={e=>actualizarMolde(i,'peso',e.target.value)} /></td><td><input type="number" value={m.volumen} onChange={e=>actualizarMolde(i,'volumen',e.target.value)} /></td><td>{moldesEnsayo.length > 1 && <button className="ghost" onClick={()=>eliminarMolde(m.id)}>Eliminar</button>}</td></tr>)}</tbody></table></div>
      <button type="button" onClick={agregarMolde}>Agregar molde</button>
    </section>

    <section className="card"><h2>3. Suelo y humedad teorica</h2><div className="grid5">
      <label>Sistema<select value={sistemaSuelo} onChange={e=>setSistemaSuelo(e.target.value)}><option>SUCS</option><option>AASHTO</option></select></label>
      <label>{sistemaSuelo}<select value={sistemaSuelo === 'SUCS' ? sucs : aashto} onChange={e=>sistemaSuelo === 'SUCS' ? setSucs(e.target.value) : setAashto(e.target.value)}>{clasificaciones[sistemaSuelo].map(c=><option key={c.codigo} value={c.codigo}>{c.codigo} - {c.nombre}</option>)}</select></label>
      <label>Tipo de suelo<input value={tipoSuelo} onChange={e=>setTipoSuelo(e.target.value)} /></label>
      <label>% pasa No. 200<input type="number" value={pasa200} onChange={e=>setPasa200(e.target.value)} /></label>
      <label>LL<input type="number" value={ll} onChange={e=>setLl(e.target.value)} /></label>
      <label>IP<input type="number" value={ip} onChange={e=>setIp(e.target.value)} /></label>
    </div><div className="humidityBox"><div><span>Rango automatico de humedad</span><b>{rangoHumedad.min}% a {rangoHumedad.max}%</b><small>Valor medio sugerido: {rangoHumedad.recomendado}%</small></div><button type="button" onClick={aplicarRangoHumedad}>Aplicar humedades teoricas</button></div></section>

    <section className="card"><h2>4. Humedades teoricas y agua a colocar</h2><div className="tableWrap"><table><thead><tr><th>Punto</th><th>Humedad recomendada (%)</th><th>Humedad a ocupar (%)</th><th>Humedad inicial del suelo (%)</th><th>Masa suelo seco (g)</th><th>Agua a colocar (g/ml)</th></tr></thead><tbody>{preparacionHumedad.map((prep,i)=><tr key={i}><td>{i+1}</td><td>{humedadesTeoricas[i]}</td><td><input type="number" step="0.1" value={prep.humedad_objetivo} onChange={e=>actualizarPreparacion(i,'humedad_objetivo',e.target.value)} /></td><td><input type="number" step="0.1" value={prep.humedad_inicial} onChange={e=>actualizarPreparacion(i,'humedad_inicial',e.target.value)} /></td><td><input type="number" value={prep.masa_suelo_seco} onChange={e=>actualizarPreparacion(i,'masa_suelo_seco',e.target.value)} /></td><td><b>{aguaAAgregar(prep)}</b></td></tr>)}</tbody></table></div><button type="button" onClick={aplicarHumedadesPreparacion}>Usar estas humedades en el ensayo</button></section>

    <section className="card"><h2>5. Datos de laboratorio del ensayo</h2><div className="tableWrap"><table><thead><tr><th>Punto</th>{modoMoldes === 'multiple' && <th>Molde usado</th>}<th>Molde+suelo humedo (g)</th><th>Peso molde (g)</th><th>Volumen (cm3)</th><th>Recipiente (g)</th><th>Recipiente+humedo (g)</th><th>Recipiente+seco (g)</th><th>Humedad (%)</th><th></th></tr></thead><tbody>{puntos.map((r,i)=><tr key={i}><td>{i+1}</td>{modoMoldes === 'multiple' && <td><select value={r.molde_id} onChange={e=>asignarMoldePunto(i,e.target.value)}>{moldesEnsayo.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}</select></td>}<td><input type="number" value={r.peso_molde_suelo} onChange={e=>actualizarPunto(i,'peso_molde_suelo',e.target.value)} /></td><td><input type="number" value={r.peso_molde} onChange={e=>actualizarPunto(i,'peso_molde',e.target.value)} /></td><td><input type="number" value={r.volumen} onChange={e=>actualizarPunto(i,'volumen',e.target.value)} /></td><td><input type="number" value={r.peso_recipiente} onChange={e=>actualizarPunto(i,'peso_recipiente',e.target.value)} /></td><td><input type="number" value={r.peso_recipiente_suelo_humedo} onChange={e=>actualizarPunto(i,'peso_recipiente_suelo_humedo',e.target.value)} /></td><td><input type="number" value={r.peso_recipiente_suelo_seco} onChange={e=>actualizarPunto(i,'peso_recipiente_suelo_seco',e.target.value)} /></td><td><input type="number" value={r.humedad} onChange={e=>actualizarPunto(i,'humedad',e.target.value)} /></td><td><button className="ghost" onClick={()=>eliminarFila(i)}>Eliminar</button></td></tr>)}</tbody></table></div><button onClick={agregarFila}>Agregar punto</button><button className="secondary" onClick={calcularTodasHumedades}>Calcular humedades de laboratorio</button></section>

    <section className="card"><h2>6. Curva corregida</h2><label className="check"><input type="checkbox" checked={aplicarCorreccion} onChange={e=>setAplicarCorreccion(e.target.checked)} /> Aplicar correccion por material grueso</label>{aplicarCorreccion && <div className="grid2"><label>% retenido grueso<input type="number" value={porcentajeGrueso} onChange={e=>setPorcentajeGrueso(e.target.value)} /></label><label>Gs material grueso<input type="number" step="0.01" value={gsGrueso} onChange={e=>setGsGrueso(e.target.value)} /></label></div>}<button className="primary" onClick={calcular}>Calcular ensayo</button>{error && <p className="error">{error}</p>}</section>

    {resultados && <Resultados data={resultados} />}
    <footer className="appFooter">{derechosReservados}</footer>
  </div>
}
