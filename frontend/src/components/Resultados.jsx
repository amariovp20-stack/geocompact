import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer, ReferenceDot, Scatter } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

const derechosReservados = 'Derechos reservados GEOSERVI LAB - ING. ABEL MARIO VEGA PEREZ.';

export default function Resultados({ data }){
  if(data.error) return <section className="card error">{data.error}</section>;

  const [curvasVisibles, setCurvasVisibles] = useState({ original:true, corregida:true, saturacion:true });
  const [escala, setEscala] = useState('ajustada');

  const chartData = data.curva.x.map((x,i)=>({
    humedad: Number(x.toFixed(2)),
    original: Number(data.curva.original[i].toFixed(3)),
    corregida: Number(data.curva.corregida[i].toFixed(3)),
    s80: Number(data.curva.s80[i].toFixed(3)),
    s90: Number(data.curva.s90[i].toFixed(3)),
    s100: Number(data.curva.s100[i].toFixed(3)),
  }));
  const puntosOriginales = data.resultados.map(r=>({
    humedad: Number(r.humedad.toFixed(2)),
    densidad: Number(r.densidad_seca.toFixed(3)),
    punto: r.punto,
  }));
  const puntosCorregidos = data.resultados.map(r=>({
    humedad: Number(r.humedad.toFixed(2)),
    densidad: Number(r.densidad_corregida.toFixed(3)),
    punto: r.punto,
  }));

  const dominios = useMemo(() => {
    const humedades = data.resultados.map(r=>r.humedad);
    const densidades = data.resultados.flatMap(r=>[r.densidad_seca, r.densidad_corregida]);
    const hMin = Math.floor(Math.min(...humedades, data.humedad_optima, data.humedad_optima_corregida) - 1);
    const hMax = Math.ceil(Math.max(...humedades, data.humedad_optima, data.humedad_optima_corregida) + 1);
    const dMin = Number((Math.min(...densidades, data.densidad_maxima, data.densidad_maxima_corregida) - 0.08).toFixed(2));
    const dMax = Number((Math.max(...densidades, data.densidad_maxima, data.densidad_maxima_corregida) + 0.08).toFixed(2));
    return { hMin, hMax, dMin, dMax };
  }, [data]);

  const [ejes, setEjes] = useState(dominios);
  const dominioX = escala === 'manual' ? [Number(ejes.hMin), Number(ejes.hMax)] : [dominios.hMin, dominios.hMax];
  const dominioY = escala === 'manual' ? [Number(ejes.dMin), Number(ejes.dMax)] : [dominios.dMin, dominios.dMax];
  const actualizarEje = (campo, valor) => setEjes(prev=>({...prev, [campo]:valor}));
  const restablecerEjes = () => setEjes(dominios);

  const generarPDF = async()=>{
    const doc = new jsPDF('p','mm','letter');
    const agregarFooter = () => {
      const total = doc.getNumberOfPages();
      for(let i=1;i<=total;i++){
        doc.setPage(i);
        doc.setDrawColor(220,228,238);
        doc.line(14,268,202,268);
        doc.setFontSize(8);
        doc.setTextColor(80,92,110);
        doc.text(derechosReservados, 14, 273);
        doc.text(`Pagina ${i} de ${total}`, 178, 273);
      }
    };
    const dg = data.datos_generales || {};
    doc.setFillColor(18,53,91); doc.rect(0,0,216,26,'F');
    doc.setTextColor(255,255,255); doc.setFontSize(16); doc.text('REPORTE DE ENSAYO PROCTOR', 14, 14);
    doc.setFontSize(9); doc.text('GeoCompact Pro v5 - Reporte academico/profesional', 14, 21);
    doc.setTextColor(0,0,0); doc.setFontSize(10);
    let y=34;
    doc.text(`Proyecto: ${dg.proyecto || '-'}`,14,y); doc.text(`Solicitante: ${dg.solicitante || '-'}`,110,y); y+=7;
    doc.text(`Ubicacion: ${dg.ubicacion || '-'}`,14,y); doc.text(`Muestra: ${dg.muestra || '-'}`,110,y); y+=7;
    doc.text(`Profundidad: ${dg.profundidad || '-'}`,14,y); doc.text(`Fecha: ${dg.fecha || '-'}`,110,y); y+=7;
    doc.text(`Tecnico: ${dg.tecnico || '-'}`,14,y); doc.text(`Metodo: ${data.metodo}`,110,y); y+=7;
    doc.text(`Molde: ${data.molde}`,14,y); doc.text(`Gs suelo: ${data.parametros.gs_suelo}`,110,y); y+=9;

    autoTable(doc,{startY:y, head:[['Parametro','Resultado']], body:[
      ['Humedad optima original', `${data.humedad_optima.toFixed(2)} %`],
      ['Densidad seca maxima original', `${data.densidad_maxima.toFixed(3)} g/cm3`],
      ['Humedad optima corregida', `${data.humedad_optima_corregida.toFixed(2)} %`],
      ['Densidad seca maxima corregida', `${data.densidad_maxima_corregida.toFixed(3)} g/cm3`],
      ['Recomendacion de humedad', data.recomendacion_humedad]
    ], styles:{fontSize:8}, headStyles:{fillColor:[18,53,91]}});

    autoTable(doc,{startY:doc.lastAutoTable.finalY+6, head:[['Punto','Molde','Humedad %','Dens. humeda','Dens. seca','Dens. corregida']], body:data.resultados.map(r=>[r.punto, r.molde_id || '-', r.humedad.toFixed(2), r.densidad_humeda.toFixed(3), r.densidad_seca.toFixed(3), r.densidad_corregida.toFixed(3)]), styles:{fontSize:8}, headStyles:{fillColor:[31,78,121]}});

    const chart = document.getElementById('grafica-proctor');
    if(chart){
      const canvas = await html2canvas(chart,{scale:2, backgroundColor:'#ffffff'});
      const img = canvas.toDataURL('image/png');
      doc.addPage();
      doc.setFontSize(13); doc.text('Curva Proctor',14,18);
      doc.addImage(img,'PNG',12,26,190,105);
    }
    doc.addPage(); doc.setFontSize(13); doc.text('Alarmas y observaciones tecnicas',14,18); doc.setFontSize(9);
    const alarmas = data.alarmas.length ? data.alarmas : ['No se detectaron alarmas criticas.'];
    alarmas.forEach((a,i)=>doc.text(`- ${a}`,16,30+i*6));
    agregarFooter();
    doc.save('reporte_proctor_geocompact_v5.pdf');
  };

  return <section className="card results"><h2>7. Resultados del ensayo</h2>
    <div className="kpis"><div><span>Humedad optima</span><b>{data.humedad_optima.toFixed(2)} %</b></div><div><span>Densidad seca maxima</span><b>{data.densidad_maxima.toFixed(3)} g/cm3</b></div><div><span>Humedad optima corregida</span><b>{data.humedad_optima_corregida.toFixed(2)} %</b></div><div><span>Densidad corregida maxima</span><b>{data.densidad_maxima_corregida.toFixed(3)} g/cm3</b></div></div>
    <p className="note"><b>Recomendacion:</b> {data.recomendacion_humedad}</p>

    <div className="chartControls">
      <label className="check"><input type="checkbox" checked={curvasVisibles.original} onChange={e=>setCurvasVisibles({...curvasVisibles, original:e.target.checked})} /> Grafica original</label>
      <label className="check"><input type="checkbox" checked={curvasVisibles.corregida} onChange={e=>setCurvasVisibles({...curvasVisibles, corregida:e.target.checked})} /> Grafica corregida</label>
      <label className="check"><input type="checkbox" checked={curvasVisibles.saturacion} onChange={e=>setCurvasVisibles({...curvasVisibles, saturacion:e.target.checked})} /> Saturacion</label>
      <label>Vista<select value={escala} onChange={e=>setEscala(e.target.value)}><option value="ajustada">Ajustada a la curva</option><option value="manual">Manual</option></select></label>
      {escala === 'manual' && <>
        <label>Humedad min<input type="number" value={ejes.hMin} onChange={e=>actualizarEje('hMin',e.target.value)} /></label>
        <label>Humedad max<input type="number" value={ejes.hMax} onChange={e=>actualizarEje('hMax',e.target.value)} /></label>
        <label>Densidad min<input type="number" step="0.01" value={ejes.dMin} onChange={e=>actualizarEje('dMin',e.target.value)} /></label>
        <label>Densidad max<input type="number" step="0.01" value={ejes.dMax} onChange={e=>actualizarEje('dMax',e.target.value)} /></label>
        <button type="button" className="ghost" onClick={restablecerEjes}>Restablecer</button>
      </>}
    </div>

    <div id="grafica-proctor" className="chartBox"><ResponsiveContainer width="100%" height={480}><LineChart data={chartData} margin={{top:20,right:28,left:18,bottom:24}}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="humedad" type="number" domain={dominioX} allowDataOverflow label={{value:'Humedad (%)',position:'insideBottom',offset:-12}}/><YAxis type="number" domain={dominioY} allowDataOverflow label={{value:'Densidad seca (g/cm3)',angle:-90,position:'insideLeft'}}/><Tooltip/><Legend/><ReferenceDot x={Number(data.humedad_optima.toFixed(2))} y={Number(data.densidad_maxima.toFixed(3))} r={5} label="Optimo"/>{curvasVisibles.original && <Line type="monotone" dataKey="original" name="Curva original" stroke="#12355b" strokeWidth={3} dot={false}/>} {curvasVisibles.corregida && <Line type="monotone" dataKey="corregida" name="Curva corregida" stroke="#0f766e" strokeWidth={3} dot={false}/>} {curvasVisibles.saturacion && <Line type="monotone" dataKey="s80" name="S=80%" stroke="#94a3b8" strokeDasharray="5 5" dot={false}/>} {curvasVisibles.saturacion && <Line type="monotone" dataKey="s90" name="S=90%" stroke="#64748b" strokeDasharray="5 5" dot={false}/>} {curvasVisibles.saturacion && <Line type="monotone" dataKey="s100" name="S=100%" stroke="#334155" strokeDasharray="5 5" dot={false}/>} {curvasVisibles.original && <Scatter name="Puntos calculados" data={puntosOriginales} dataKey="densidad" fill="#12355b" shape="circle" />} {curvasVisibles.corregida && <Scatter name="Puntos corregidos" data={puntosCorregidos} dataKey="densidad" fill="#0f766e" shape="diamond" />}</LineChart></ResponsiveContainer></div>

    <div className="tableWrap"><table><thead><tr><th>Punto</th><th>Molde</th><th>Humedad %</th><th>Densidad humeda</th><th>Densidad seca</th><th>Densidad corregida</th></tr></thead><tbody>{data.resultados.map(r=><tr key={r.punto}><td>{r.punto}</td><td>{r.molde_id || '-'}</td><td>{r.humedad.toFixed(2)}</td><td>{r.densidad_humeda.toFixed(3)}</td><td>{r.densidad_seca.toFixed(3)}</td><td>{r.densidad_corregida.toFixed(3)}</td></tr>)}</tbody></table></div>
    <h3>Alarmas tecnicas</h3>{data.alarmas.length===0?<p className="ok">No se detectaron alarmas criticas.</p>:data.alarmas.map((a,i)=><p key={i} className="warn">{a}</p>)}
    <button className="primary" onClick={generarPDF}>Generar PDF profesional</button>
    <p className="printRights">{derechosReservados}</p>
  </section>
}
