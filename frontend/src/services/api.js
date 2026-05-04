export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://127.0.0.1:8000');
export async function calcularProctor(body){
  const res = await fetch(`${API_URL}/calcular-proctor`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)});
  if(!res.ok) throw new Error('Error al calcular el ensayo');
  return res.json();
}
